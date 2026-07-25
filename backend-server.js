import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Mock data generator
function generateMockData() {
  const processes = [
    { pid: 1234, name: 'nginx', socket_count: 8, memory_usage: 45.2, cpu_usage: 12.5, status: 'running' },
    { pid: 5678, name: 'node', socket_count: 15, memory_usage: 128.7, cpu_usage: 35.8, status: 'running' },
    { pid: 9101, name: 'postgres', socket_count: 6, memory_usage: 256.3, cpu_usage: 8.2, status: 'running' },
    { pid: 1121, name: 'redis', socket_count: 4, memory_usage: 87.4, cpu_usage: 2.1, status: 'running' },
  ];

  const sockets = [
    { pid: 1234, process_name: 'nginx', local_address: '0.0.0.0:80', remote_address: 'N/A', state: 'LISTENING', protocol: 'TCP', memory_usage: 2.1, is_hung: false, has_leak: false },
    { pid: 1234, process_name: 'nginx', local_address: '0.0.0.0:443', remote_address: 'N/A', state: 'LISTENING', protocol: 'TCP', memory_usage: 2.3, is_hung: false, has_leak: false },
    { pid: 1234, process_name: 'nginx', local_address: '127.0.0.1:8080', remote_address: '192.168.1.100:54321', state: 'ESTABLISHED', protocol: 'TCP', memory_usage: 1.8, is_hung: false, has_leak: false },
    { pid: 5678, process_name: 'node', local_address: '127.0.0.1:3000', remote_address: 'N/A', state: 'LISTENING', protocol: 'TCP', memory_usage: 3.2, is_hung: false, has_leak: false },
    { pid: 5678, process_name: 'node', local_address: '127.0.0.1:3000', remote_address: '192.168.1.50:45678', state: 'ESTABLISHED', protocol: 'TCP', memory_usage: 2.9, is_hung: false, has_leak: false },
    { pid: 5678, process_name: 'node', local_address: '127.0.0.1:3000', remote_address: '192.168.1.51:45679', state: 'ESTABLISHED', protocol: 'TCP', memory_usage: 2.7, is_hung: false, has_leak: false },
    { pid: 5678, process_name: 'node', local_address: '127.0.0.1:3000', remote_address: '10.0.0.5:52100', state: 'TIME_WAIT', protocol: 'TCP', memory_usage: 1.5, is_hung: false, has_leak: false },
    { pid: 9101, process_name: 'postgres', local_address: '127.0.0.1:5432', remote_address: 'N/A', state: 'LISTENING', protocol: 'TCP', memory_usage: 4.1, is_hung: false, has_leak: false },
    { pid: 9101, process_name: 'postgres', local_address: '127.0.0.1:5432', remote_address: '192.168.1.200:55432', state: 'ESTABLISHED', protocol: 'TCP', memory_usage: 3.8, is_hung: false, has_leak: false },
    { pid: 1121, process_name: 'redis', local_address: '127.0.0.1:6379', remote_address: 'N/A', state: 'LISTENING', protocol: 'TCP', memory_usage: 1.2, is_hung: false, has_leak: false },
  ];

  const memory = [
    { pid: 1234, address: '0x7f1234560000', size: 8388608, permissions: 'r-xp', type: 'TEXT', is_shared: false },
    { pid: 1234, address: '0x7f1234761000', size: 4194304, permissions: 'r--p', type: 'DATA', is_shared: false },
    { pid: 1234, address: '0x7f1234962000', size: 2097152, permissions: 'rw-p', type: 'BSS', is_shared: false },
    { pid: 5678, address: '0x400000', size: 16777216, permissions: 'r-xp', type: 'TEXT', is_shared: false },
    { pid: 5678, address: '0x2000000', size: 8388608, permissions: 'rw-p', type: 'DATA', is_shared: false },
    { pid: 9101, address: '0x555554000000', size: 33554432, permissions: 'r-xp', type: 'TEXT', is_shared: false },
    { pid: 9101, address: '0x555556201000', size: 16777216, permissions: 'rw-p', type: 'DATA', is_shared: false },
    { pid: 1121, address: '0x560000000000', size: 4194304, permissions: 'r-xp', type: 'TEXT', is_shared: true },
  ];

  return {
    sockets,
    memory,
    processes,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    binary_exists: true,
    binary_path: '/usr/local/bin/sockmap',
  });
});

app.get('/api/trace-sockets', (req, res) => {
  const data = generateMockData();
  res.json(data);
});

app.get('/api/sockets', (req, res) => {
  const data = generateMockData();
  res.json({
    sockets: data.sockets,
    timestamp: data.timestamp,
  });
});

app.get('/api/memory', (req, res) => {
  const data = generateMockData();
  res.json({
    memory: data.memory,
    timestamp: data.timestamp,
  });
});

app.get('/api/processes', (req, res) => {
  const data = generateMockData();
  res.json({
    processes: data.processes,
    timestamp: data.timestamp,
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    scan_interval: 5,
    output_format: 'json',
    verbose: false,
  });
});

app.post('/api/config', (req, res) => {
  const config = req.body;
  res.json({ status: 'updated', config });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ SockMap Backend running on http://localhost:${PORT}`);
  console.log(`✓ API endpoints available at http://localhost:${PORT}/api`);
});
