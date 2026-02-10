# API Reference & REST Endpoints

## Base URL

```
http://localhost:5000/api
```

## Authentication

Currently, SockMap API has no authentication. For production deployments, add reverse proxy authentication (nginx/Apache).

---

## Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

**Description:** Verify API and backend service health.

**Response:**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "backend": "ready"
}
```

**Status Codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Backend unavailable

---

### 2. Get All Sockets

**Endpoint:** `GET /api/sockets`

**Description:** Retrieve all active TCP connections with detailed state information.

**Query Parameters:**
- `filter` (optional): Filter by state (ESTABLISHED, LISTENING, CLOSE_WAIT, TIME_WAIT, etc.)

**Response:**
```json
{
  "sockets": [
    {
      "localAddr": "127.0.0.1",
      "localPort": 8000,
      "remoteAddr": "0.0.0.0",
      "remotePort": 0,
      "state": "LISTEN",
      "processName": "python",
      "pid": 1234,
      "flags": []
    },
    {
      "localAddr": "192.168.1.100",
      "localPort": 54321,
      "remoteAddr": "93.184.216.34",
      "remotePort": 443,
      "state": "ESTABLISHED",
      "processName": "curl",
      "pid": 5678,
      "flags": ["OK"]
    }
  ],
  "summary": {
    "totalConnections": 42,
    "listening": 8,
    "established": 28,
    "timeWait": 4,
    "closeWait": 2
  }
}
```

**Socket States:**
- `LISTEN` - Accepting incoming connections
- `ESTABLISHED` - Active connection
- `TIME_WAIT` - Waiting after connection close
- `CLOSE_WAIT` - Waiting for application to close
- `SYN_SENT` - Initiating connection
- `LAST_ACK` - Final handshake

**Flags:**
- `OK` - Normal connection
- `Hung` - Connection stuck (CLOSE_WAIT)
- `Leak` - Associated memory >10KB

---

### 3. Get Memory Maps

**Endpoint:** `GET /api/memory`

**Description:** Retrieve memory segment mappings across all processes.

**Query Parameters:**
- `type` (optional): Filter by segment type (heap, stack, library, code, data)
- `pid` (optional): Get memory for specific process ID

**Response:**
```json
{
  "memorySegments": [
    {
      "pid": 1234,
      "processName": "node",
      "startAddress": "0x7f1234567000",
      "endAddress": "0x7f1234578000",
      "size": 69632,
      "permissions": "rw-p",
      "type": "heap",
      "shared": false,
      "filename": "[heap]"
    },
    {
      "pid": 1234,
      "processName": "node",
      "startAddress": "0x7ffee1234000",
      "endAddress": "0x7ffee2345000",
      "size": 4096,
      "permissions": "rw-p",
      "type": "stack",
      "shared": false,
      "filename": "[stack]"
    }
  ],
  "summary": {
    "totalSegments": 156,
    "heapMemory": 2048576,
    "stackMemory": 8192,
    "libraryMemory": 5242880
  }
}
```

**Segment Types:**
- `heap` - Dynamic memory allocation
- `stack` - Thread/process stack
- `library` - Shared libraries (.so)
- `code` - Executable code segments
- `data` - Static data segments
- `anonymous` - Anonymous memory

**Permissions:**
- `r` - Read
- `w` - Write
- `x` - Execute
- `p` - Private (s = shared)

---

### 4. Get Process Information

**Endpoint:** `GET /api/processes`

**Description:** Retrieve resource statistics for all running processes.

**Query Parameters:**
- `sort` (optional): Sort by memory, cpu, or sockets

**Response:**
```json
{
  "processes": [
    {
      "pid": 1234,
      "name": "nginx",
      "state": "S",
      "socketCount": 4,
      "memoryMB": 12.5,
      "cpuPercent": 0.2,
      "memoryPercent": 0.5,
      "status": "running"
    },
    {
      "pid": 5678,
      "name": "postgresql",
      "state": "S",
      "socketCount": 2,
      "memoryMB": 256.8,
      "cpuPercent": 1.5,
      "memoryPercent": 8.2,
      "status": "running"
    }
  ],
  "summary": {
    "totalProcesses": 156,
    "totalMemoryMB": 2048,
    "averageCpuPercent": 2.1
  }
}
```

**Process States:**
- `R` - Running
- `S` - Sleeping
- `D` - Disk sleep (uninterruptible)
- `Z` - Zombie
- `T` - Stopped

---

### 5. Trace Detailed Sockets

**Endpoint:** `GET /api/trace-sockets`

**Description:** Get detailed socket information with stack traces (if available).

**Response:**
```json
{
  "traces": [
    {
      "socket": {
        "localAddr": "127.0.0.1",
        "localPort": 5432,
        "remoteAddr": "0.0.0.0",
        "remotePort": 0,
        "state": "LISTEN"
      },
      "process": {
        "pid": 2341,
        "name": "postgresql",
        "memoryMB": 256.8
      },
      "anomalies": []
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Common Errors:**
- `400 Bad Request` - Invalid query parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Backend parsing error
- `503 Service Unavailable` - Backend service down

---

## Rate Limiting

- No rate limiting by default
- Recommended: 1 request per 5 seconds per client
- Each request triggers a full system scan (~100ms)

## Timeout

- API timeout: 10 seconds
- Scan timeout: 5 seconds
- Configure in `app.py` if needed

## CORS Headers

All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

---

## Example Usage

### cURL

```bash
# Get all sockets
curl http://localhost:5000/api/sockets

# Filter by state
curl http://localhost:5000/api/sockets?filter=ESTABLISHED

# Get memory maps
curl http://localhost:5000/api/memory

# Get processes sorted by memory
curl http://localhost:5000/api/processes?sort=memory
```

### JavaScript/Fetch

```javascript
// Fetch all sockets
const response = await fetch('http://localhost:5000/api/sockets');
const data = await response.json();
console.log(data.sockets);

// Fetch processes
const processes = await fetch('http://localhost:5000/api/processes');
const procData = await processes.json();
```

### Python

```python
import requests

# Get API health
response = requests.get('http://localhost:5000/api/health')
print(response.json())

# Get sockets
sockets = requests.get('http://localhost:5000/api/sockets')
print(sockets.json())
```

---

## Next Steps

- See [Architecture Overview](./01-architecture-overview.md) for system design
- Review [Anomaly Detection](./03-anomaly-detection.md) for detection logic
- Check [Deployment Guide](./05-deployment-guide.md) for production setup
