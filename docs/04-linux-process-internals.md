# Understanding Linux Process Internals

## Overview

SockMap's power comes from deep knowledge of Linux kernel interfaces. This guide explains the `/proc` filesystem, how to parse it, and what you can learn about processes and sockets from these virtual files.

---

## The /proc Filesystem

### What Is It?

The `/proc` filesystem is a virtual filesystem that exposes kernel data structures about:
- Running processes and threads
- Hardware information
- Network statistics
- Kernel parameters

**Key fact:** `/proc` is dynamically generated. Files don't exist on disk; they're generated on-read from kernel memory.

### Structure

```
/proc/
├── [PID]/                 # Per-process directories
│   ├── cmdline            # Command line arguments
│   ├── comm               # Process name
│   ├── stat               # Process statistics
│   ├── status             # Detailed process info
│   ├── maps               # Memory mappings
│   ├── fd/                # File descriptors (symlinks)
│   └── environ            # Environment variables
├── net/
│   ├── tcp                # TCP connections
│   ├── udp                # UDP connections
│   └── unix               # Unix sockets
└── [other kernel data]
```

---

## Process Information

### /proc/[PID]/comm

**Purpose:** Process name (command)

```bash
$ cat /proc/1234/comm
python3
```

**Usage in SockMap:**
```c
// Read process name
snprintf(path, sizeof(path), "/proc/%d/comm", pid);
FILE *f = fopen(path, "r");
fscanf(f, "%s", process_name);
```

### /proc/[PID]/stat

**Purpose:** Process statistics (CPU, memory, state, etc.)

```bash
$ cat /proc/1234/stat
1234 (python3) S 1 1234 1234 0 -1 4194304 2345 0 0 0 10 5 0 0 20 0 1 0 12345678
```

**Fields (space-separated):**
1. PID
2. Comm (command in parens)
3. State (R=running, S=sleeping, D=disk sleep, Z=zombie, T=stopped)
4. PPID (parent PID)
5. PGRP
6. Session
... [more fields] ...
14. UTIME (user CPU time in jiffies)
15. STIME (system CPU time in jiffies)

**Calculate CPU usage:**
```c
unsigned long utime, stime;
// Parse fields 14 and 15
cpu_percent = ((utime + stime) / sysconf(_SC_CLK_TCK)) / total_seconds * 100;
```

### /proc/[PID]/status

**Purpose:** Detailed process information in readable format

```bash
$ cat /proc/1234/status
Name:   python3
State:  S (sleeping)
Pid:    1234
PPid:   1
VmSize:  123456 kB      # Virtual memory
VmRss:   45678 kB       # Resident set (physical memory)
VmData:  12345 kB       # Heap
VmStk:   84 kB          # Stack
```

**Usage in SockMap:**
```c
// Extract memory usage
snprintf(path, sizeof(path), "/proc/%d/status", pid);
FILE *f = fopen(path, "r");
char line[256];
while (fgets(line, sizeof(line), f)) {
  if (strncmp(line, "VmRss:", 6) == 0) {
    sscanf(line, "VmRss: %lu", &rss_kb);
  }
}
```

### /proc/[PID]/maps

**Purpose:** Memory mappings (virtual address layout)

```bash
$ cat /proc/1234/maps
7f1234000000-7f1234010000 r-xp 00000000 08:05 12345 /lib/x86_64-linux-gnu/libc-2.31.so
7f1234010000-7f1234200000 ---p 00010000 08:05 12345 /lib/x86_64-linux-gnu/libc-2.31.so
7ffff7dd1000-7ffff7dd5000 r-xp 00000000 00:00 0      [vdso]
7ffffffde000-7ffffffff000 rw-p 00000000 00:00 0      [stack]
```

**Format:** `start-end permissions offset device inode [filename]`

**Permissions:**
- `r` = read
- `w` = write
- `x` = execute
- `p` = private
- `s` = shared

**Usage in SockMap:**
```c
// Parse memory maps
FILE *f = fopen("/proc/1234/maps", "r");
while (fscanf(f, "%lx-%lx %s ...", &start, &end, perms) == 3) {
  // Classify segment
  if (strstr(line, "[heap]")) type = HEAP;
  if (strstr(line, "[stack]")) type = STACK;
  // etc.
}
```

---

## File Descriptors

### /proc/[PID]/fd/

**Purpose:** Symlinks to open files and sockets

```bash
$ ls -la /proc/1234/fd/
lrwx------ 1 user user 64 Jan 15 10:30 0 -> /dev/pts/0
lrwx------ 1 user user 64 Jan 15 10:30 1 -> /dev/pts/0
lrwx------ 1 user user 64 Jan 15 10:30 3 -> socket:[123456789]
lrwx------ 1 user user 64 Jan 15 10:30 4 -> /var/log/app.log
```

**Socket Identification:**
- `socket:[INODE_NUMBER]` = TCP/UDP socket
- `[INODE_NUMBER]` = unique identifier across system

**Usage in SockMap:**
```c
// Count sockets for a process
DIR *fd_dir = opendir("/proc/1234/fd");
struct dirent *entry;
int socket_count = 0;
while ((entry = readdir(fd_dir)) != NULL) {
  char path[256];
  char link[256];
  snprintf(path, sizeof(path), "/proc/1234/fd/%s", entry->d_name);
  if (readlink(path, link, sizeof(link)) > 0) {
    if (strncmp(link, "socket:", 7) == 0) {
      socket_count++;
    }
  }
}
```

---

## Network Information

### /proc/net/tcp

**Purpose:** All TCP sockets and their states

```bash
$ cat /proc/net/tcp
  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 0100007F:1F40 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 12345678
   1: 0100007F:A123 5D5D4D0E:01BB 01 00000000:00000000 00:00000000 00000000  1000        0 87654321
```

**Format:** Hex-encoded IP addresses and ports

**Example decode:**
- `0100007F` = 127.0.0.1 (little-endian)
- `1F40` = 8000 in hex (port 8000)
- `0A` = 10 in decimal (socket state 10 = LISTEN)

**Socket States (decimal):**
- 1 = ESTABLISHED
- 2 = SYN_SENT
- 3 = SYN_RECV
- 4 = FIN_WAIT1
- 5 = FIN_WAIT2
- 6 = TIME_WAIT
- 7 = CLOSE
- 8 = CLOSE_WAIT
- 9 = LAST_ACK
- 10 = LISTEN
- 11 = CLOSING

**Usage in SockMap:**
```c
FILE *f = fopen("/proc/net/tcp", "r");
char line[256];
fgets(line, sizeof(line), f);  // Skip header

while (fgets(line, sizeof(line), f)) {
  unsigned int local_addr, rem_addr, local_port, rem_port, state;
  sscanf(line, "%*d: %X:%X %X:%X %X",
         &local_addr, &local_port, &rem_addr, &rem_port, &state);
  
  // Convert hex port to decimal
  local_port = ntohs((uint16_t)local_port);
  rem_port = ntohs((uint16_t)rem_port);
}
```

### /proc/net/udp

**Purpose:** All UDP sockets (same format as TCP)

---

## Performance Considerations

### Parsing Efficiency

**Problem:** Reading 1000+ processes and their maps is slow

**Solutions:**
1. **Batch reads:** One pass per scan, not per process
2. **Parse in C:** Avoid Python overhead
3. **Limit frequency:** 5-second intervals, not per-request
4. **Cache:** Store results between scans

### Memory Usage

- Each process's `/proc/[PID]/maps` can be large (hundreds of KB)
- Reading all process maps for 1000 processes = significant memory
- SockMap limits to active processes only

---

## Advanced Techniques

### inode Mapping

Map socket inodes to PIDs/process names:

```c
// For each socket inode in /proc/net/tcp
for (each process) {
  DIR *fd_dir = opendir("/proc/[PID]/fd");
  // Check if socket:[inode] exists
  if (socket inode found) {
    socket->pid = PID;
    socket->process_name = get_comm(PID);
  }
}
```

### Memory Classification

Classify memory segments:

```c
const char *classify_memory(const char *line) {
  if (strstr(line, "[heap]")) return "HEAP";
  if (strstr(line, "[stack]")) return "STACK";
  if (strstr(line, ".so")) return "LIBRARY";
  if (strstr(line, "rwxp")) return "CODE";
  return "ANONYMOUS";
}
```

### Real-Time Tracking

Store previous scan results and compare for:
- Memory growth trends
- New/closed connections
- Process lifecycle events

---

## Limitations & Gotchas

### Security

- Root can see all `/proc/[PID]` entries
- Non-root sees only own processes (and kernel info)
- SockMap typically runs as root for full visibility

### Race Conditions

- Process can exit between scan start and data read
- Use error handling: check if file exists, handle ENOENT

### Architecture Variations

- Inode numbers differ between filesystems
- Hex encoding endianness varies
- Memory segment layout differs by kernel version

### Example Defensive Code

```c
// Handle process that exits during scan
FILE *f = fopen(path, "r");
if (f == NULL) {
  if (errno == ENOENT) {
    // Process exited, skip silently
    return;
  }
  perror("fopen");
  return;
}
```

---

## Next Steps

- Read [Architecture Overview](./01-architecture-overview.md) for system design
- Review [API Reference](./02-api-reference.md) for data exposure
- Check [Anomaly Detection](./03-anomaly-detection.md) to see internals in action
