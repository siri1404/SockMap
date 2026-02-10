# Detecting and Preventing System Anomalies

## Overview

SockMap detects and flags three categories of system anomalies that indicate problems or potential issues:

1. **Hung Connections** - Sockets stuck in problematic states
2. **Memory Leaks** - Processes holding excessive memory
3. **Zombie Processes** - Terminated processes not cleaned up

This guide explains detection heuristics and what each anomaly means.

---

## Hung Connections

### What It Means

A "hung" connection is a TCP socket stuck in the `CLOSE_WAIT` state. This happens when:
1. Remote end initiates connection close (sends FIN)
2. Local application receives FIN but doesn't close its side
3. Connection lingers indefinitely, consuming resources

### Detection Logic

**Condition:** Socket state = `CLOSE_WAIT`

```c
if (strcmp(socket->state, "CLOSE_WAIT") == 0) {
  socket->is_hung = true;
  socket->flag = "Hung";
}
```

### Why It's a Problem

- **Resource Leak:** Each hung socket consumes file descriptor and memory
- **Connection Limit:** Too many hung sockets hit OS file descriptor limit
- **Application Bug:** Indicates application doesn't properly close connections
- **Performance Degradation:** Fills connection pools, prevents new connections

### Common Causes

**Application Code:**
```python
# BAD: Connection never closed
socket.connect(('example.com', 80))
# ... do something ...
# Missing: socket.close()
```

**Network Issues:**
- Firewall silently drops connections
- Proxy doesn't propagate close signals
- Network timeout without cleanup

### Resolution

**Short-term:**
1. Identify hung connection's PID: `sockmap | grep CLOSE_WAIT`
2. Restart process: `kill -9 <PID>`
3. Monitor for recurrence

**Long-term:**
1. Add connection timeout in application
2. Implement proper connection cleanup (try/finally)
3. Use connection pooling with max age limits

**Example Fix (Python):**
```python
import socket
import contextlib

@contextlib.contextmanager
def managed_socket():
  sock = socket.socket()
  try:
    sock.connect(('example.com', 80))
    yield sock
  finally:
    sock.close()  # Always called

with managed_socket() as sock:
  # Use socket
  pass
```

---

## Memory Leaks

### What It Means

SockMap flags a memory leak when a process holds memory segments larger than 10KB that appear to be growing over time or aren't associated with legitimate code/libraries.

### Detection Logic

**Conditions:**
- Segment type = `anonymous` or `heap`
- Segment size > 10KB
- Process holding segment for extended time (multiple scans)

```c
if ((segment->type == HEAP || segment->type == ANONYMOUS) &&
    segment->size > 10240 &&  // 10KB
    !segment->is_library) {
  segment->is_leak = true;
  segment->flag = "Leak";
}
```

### Why It's a Problem

- **OOM Crashes:** Eventually exhausts system memory
- **Performance:** Memory pressure triggers swapping (disk I/O)
- **Cascading Failures:** One leaky app destabilizes entire system
- **Cost:** Cloud deployments charged by memory used

### Common Causes

**C/C++ Memory Leaks:**
```c
// BAD: Allocating without freeing
char *buffer = malloc(1024);
buffer = malloc(1024);  // Previous allocation lost
// Missing: free(buffer);
```

**Python Reference Cycles:**
```python
# BAD: Circular reference prevents garbage collection
class Node:
  def __init__(self):
    self.parent = None
    self.children = []

a = Node()
b = Node()
a.children.append(b)
b.parent = a  # Circular reference
del a, b      # Never freed
```

**JavaScript DOM References:**
```javascript
// BAD: Detached DOM nodes held in memory
let detachedNodes = [];
detachedNodes.push(document.body.removeChild(element));
// Element never garbage collected
```

### Detection Tools

**Track over time:**
```bash
# Run SockMap periodically and track memory growth
watch -n 5 'sockmap -j | grep -A5 "node" | grep -i leak'
```

**Memory profilers:**
- **Python:** `memory_profiler`, `objgraph`
- **C/C++:** `valgrind`, `AddressSanitizer`
- **JavaScript:** Chrome DevTools Memory profiler

### Resolution

**Immediate:**
1. Identify process with leak: `sockmap | grep Leak`
2. Restart: `systemctl restart <service>`
3. Monitor memory: `ps aux | grep <process>`

**Debugging:**
```bash
# Check process memory maps
cat /proc/<PID>/maps

# Check virtual memory usage
ps -o virt=,rss= -p <PID>

# Get memory details
pmap -x <PID>
```

**Fix:**
1. Add instrumentation to track allocation
2. Run memory profiler to identify hotspots
3. Fix allocations: pair malloc/free, close database connections
4. Test with load to confirm fix

---

## Zombie Processes

### What It Means

A zombie process is a child process that has terminated but whose parent process hasn't reaped it (called `wait()` or `waitpid()`). The process is dead but still occupies a PID slot.

### Detection Logic

**Condition:** Process state = `Z` (Zombie)

```c
if (process->state == 'Z') {
  process->status = "zombie";
  process->flag = "Zombie";
}
```

### Why It's a Problem

- **PID Exhaustion:** Limited PIDs (32k default). Too many zombies prevent new processes
- **Resource Leaks:** Process table entry never freed
- **Application Error:** Indicates parent process bug
- **System Instability:** Eventually system can't spawn new processes

### Common Causes

**Parent Process Doesn't Reap Children:**
```python
# BAD: Spawning child without waiting
import subprocess
proc = subprocess.Popen(['sleep', '10'])
# Missing: proc.wait()
# Parent exits, zombie becomes orphan
```

**Parent Process Crashes:**
```bash
# Parent spawns child, parent crashes before wait()
# Child becomes orphan, assigned to init (PID 1)
```

### Detection

```bash
# List zombie processes
ps aux | grep Z

# Check which parent has zombies
ps -eo ppid,pid,stat,comm | grep Z

# Get details about zombie
cat /proc/<PID>/stat
```

### Resolution

**Short-term:**
1. Kill parent process: `kill -9 <PARENT_PID>`
2. Orphaned zombies reparent to init, which reaps them
3. Monitor for recurrence

**Long-term:**
1. Fix application to call `wait()` after spawning
2. Use process management (systemd, supervisor)
3. Implement signal handlers for child process cleanup

**Example Fix (Python):**
```python
import subprocess
import sys

# BAD
proc = subprocess.Popen(['sleep', '10'])
# Process becomes zombie if parent exits

# GOOD
proc = subprocess.Popen(['sleep', '10'])
proc.wait()  # Always reap child

# Or use context manager
with subprocess.Popen(['sleep', '10']) as proc:
  proc.wait()
```

---

## Monitoring Strategy

### Real-Time Dashboard

Access SockMap dashboard at `http://localhost:5000` to see anomalies highlighted:
- **Red** = Hung connection or zombie
- **Yellow** = Memory leak flagged
- **Green** = Normal

### Automated Alerts

**Setup cron job to monitor:**
```bash
#!/bin/bash
# Check every 5 minutes for anomalies

SOCKMAP_OUTPUT=$(sockmap -j)

# Check for hung connections
HUNG=$(echo "$SOCKMAP_OUTPUT" | jq '.sockets[] | select(.state=="CLOSE_WAIT") | length')
if [ "$HUNG" -gt 5 ]; then
  alert "Too many hung connections: $HUNG"
fi

# Check for memory leaks
LEAKS=$(echo "$SOCKMAP_OUTPUT" | jq '.summary.leaked_segments' 2>/dev/null)
if [ "$LEAKS" -gt 10 ]; then
  alert "Memory leak detected: $LEAKS segments"
fi

# Check for zombies
ZOMBIES=$(ps aux | grep -c " Z ")
if [ "$ZOMBIES" -gt 3 ]; then
  alert "Zombie processes detected: $ZOMBIES"
fi
```

### Regular Reviews

- Weekly: Check for trending anomalies
- Monthly: Audit application connection handling
- Quarterly: Memory profiling of long-running services

---

## Performance Tuning

### Sensitivity Tuning

Edit `src/socket_scan.c` and `src/memory_map.c` to adjust thresholds:

```c
// Memory leak threshold (default 10KB)
#define MEMORY_LEAK_THRESHOLD (10 * 1024)

// Hung connection timeout (default immediate)
#define CLOSE_WAIT_THRESHOLD_SECONDS 300
```

### Scan Frequency

Adjust in `app.py`:
```python
SCAN_INTERVAL = 5  # Default 5 seconds
# Reduce for higher sensitivity (>0.2 = very high CPU)
# Increase to reduce overhead
```

---

## Next Steps

- Read [API Reference](./02-api-reference.md) for querying anomalies programmatically
- See [Deployment Guide](./05-deployment-guide.md) for production monitoring setup
- Check [Architecture Overview](./01-architecture-overview.md) for system design
