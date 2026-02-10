# Building a Real-Time System Monitor

## Overview

SockMap is a three-tier system monitoring architecture that combines performance-critical C parsing, a clean REST API, and a responsive React dashboard. This guide explains how each layer works and how they integrate.

## Architecture Stack

### Layer 1: C Backend Engine

The core engine is written in C and handles all low-level Linux kernel interface parsing with zero external dependencies.

**Components:**
- **sockmap.c** - Entry point with CLI argument parsing and monitoring loop
- **socket_scan.c** - TCP connection enumeration and state detection
- **memory_map.c** - Memory segment classification and analysis
- **process_info.c** - Per-process statistics and formatting

**Key Features:**
- Parses `/proc/net/tcp` for real-time socket data
- Walks `/proc/<pid>/fd` to map inodes to processes
- Classifies memory segments (heap, stack, library, anonymous)
- Detects anomalies: hung connections (CLOSE_WAIT), memory leaks (>10KB)
- Outputs JSON or formatted table output
- Single-pass performance: <100ms per scan

### Layer 2: Python Flask API

A lightweight Flask server bridges the C backend and frontend, providing REST endpoints with CORS support.

**Endpoints:**
- `GET /api/health` - Service status check
- `GET /api/sockets` - All TCP connections with state
- `GET /api/memory` - Memory mapping across all processes
- `GET /api/processes` - Process statistics and resource usage
- `GET /api/trace-sockets` - Detailed socket trace

**Data Flow:**
1. Spawns compiled `sockmap` binary with `-j` (JSON) flag
2. Captures stdout and parses JSON response
3. Transforms snake_case to camelCase for frontend
4. Applies timeout handling (configurable per endpoint)
5. Returns structured JSON response

### Layer 3: React Dashboard

A Vite-based SPA built with React, TypeScript, and Tailwind CSS for real-time visualization.

**Components:**
- **Dashboard.tsx** - Orchestrates state and data refresh (5-second intervals)
- **StatsCards.tsx** - Summary metrics (active connections, listening ports, hung sockets, leaks)
- **SocketList.tsx** - Table view with state badges and connection filtering
- **MemoryMap.tsx** - Memory segment visualization with address ranges and permissions
- **ProcessInfo.tsx** - Per-process resource cards with usage bars

**Features:**
- Auto-refresh every 5 seconds
- Search and filter across all tables
- Color-coded status indicators
- Responsive design for desktop/tablet
- Real-time anomaly flagging

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   React Dashboard (UI)                   │
│  - Displays sockets, memory, processes in real-time     │
│  - Auto-refresh every 5 seconds                         │
│  - Search, filter, anomaly highlighting                │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP REST Calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Flask API (Data Bridge)                        │
│  - 5 REST endpoints                                      │
│  - JSON parsing and transformation                      │
│  - CORS-enabled                                         │
└────────────────────┬────────────────────────────────────┘
                     │ subprocess.run()
                     ▼
┌─────────────────────────────────────────────────────────┐
│        C Binary (sockmap) - Core Engine                 │
│  - Parses /proc filesystem                             │
│  - Socket scanning & state detection                   │
│  - Memory mapping analysis                             │
│  - Process statistics collection                       │
│  - Outputs JSON                                        │
└─────────────────────────────────────────────────────────┘
```

## Why This Architecture?

**C for Performance:** Low-level `/proc` parsing requires speed. C provides direct filesystem access without overhead, allowing sub-100ms scans even on systems with thousands of processes.

**Python for Simplicity:** REST API logic is cleaner and faster to develop in Python. Flask's simplicity doesn't sacrifice functionality for our use case.

**React for UX:** A modern SPA provides responsive, interactive dashboards with real-time updates without page refreshes.

## Performance Characteristics

- **Scan Time:** <100ms per full system scan
- **API Response:** <200ms (dominated by Flask startup overhead)
- **Dashboard Refresh:** 5-second intervals (configurable)
- **Memory Footprint:** ~15-20MB total
- **CPU Usage:** <1% idle, <5% during active monitoring

## Deployment Considerations

- C binary requires Linux environment (tested on Ubuntu 20.04+)
- Flask API can run standalone or behind nginx/Apache
- React dashboard is static-build deployable
- All three components can run on same machine or distributed
- Scales to monitor thousands of processes

## Next Steps

- Read [API Reference](./02-api-reference.md) for endpoint documentation
- See [Production Deployment](./05-deployment-guide.md) for setup instructions
- Review [Anomaly Detection](./03-anomaly-detection.md) for detection heuristics
