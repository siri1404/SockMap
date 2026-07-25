// Shared mock data generator for API routes

export function generateMockSockets() {
  return [
    {
      pid: 1234,
      process_name: 'nginx',
      local_address: '127.0.0.1:8080',
      remote_address: '192.168.1.100:54321',
      state: 'ESTABLISHED',
      memory_usage: 2048,
    },
    {
      pid: 5678,
      process_name: 'PostgreSQL',
      local_address: '0.0.0.0:5432',
      remote_address: '*:*',
      state: 'LISTEN',
      memory_usage: 4096,
    },
    {
      pid: 9012,
      process_name: 'Redis',
      local_address: '127.0.0.1:6379',
      remote_address: '192.168.1.101:51234',
      state: 'ESTABLISHED',
      memory_usage: 1024,
    },
    {
      pid: 3456,
      process_name: 'Node.js',
      local_address: '0.0.0.0:3000',
      remote_address: '*:*',
      state: 'LISTEN',
      memory_usage: 3072,
    },
    {
      pid: 7890,
      process_name: 'Chrome',
      local_address: '192.168.1.102:54567',
      remote_address: '142.251.41.14:443',
      state: 'ESTABLISHED',
      memory_usage: 512,
    },
  ];
}

export function generateMockMemory() {
  return [
    {
      start_address: '0x00400000',
      end_address: '0x00401000',
      size: '4096',
      type: 'TEXT',
      permissions: 'r-x',
    },
    {
      start_address: '0x00600000',
      end_address: '0x00601000',
      size: '4096',
      type: 'DATA',
      permissions: 'rw-',
    },
    {
      start_address: '0x7ffdd000',
      end_address: '0x7ffde000',
      size: '4096',
      type: 'STACK',
      permissions: 'rw-',
    },
    {
      start_address: '0x7f5a8000',
      end_address: '0x7f5b0000',
      size: '32768',
      type: 'HEAP',
      permissions: 'rw-',
    },
    {
      start_address: '0x7f5b0000',
      end_address: '0x7f5d0000',
      size: '131072',
      type: 'MMAP',
      permissions: 'r--',
    },
  ];
}

export function generateMockProcesses() {
  return [
    {
      pid: 1234,
      name: 'nginx',
      state: 'S',
      cpu_usage: 2.5,
      memory_usage: 2048,
      socket_count: 1,
    },
    {
      pid: 5678,
      name: 'PostgreSQL',
      state: 'S',
      cpu_usage: 5.2,
      memory_usage: 4096,
      socket_count: 1,
    },
    {
      pid: 9012,
      name: 'Redis',
      state: 'S',
      cpu_usage: 1.8,
      memory_usage: 1024,
      socket_count: 1,
    },
    {
      pid: 3456,
      name: 'Node.js',
      state: 'S',
      cpu_usage: 3.1,
      memory_usage: 3072,
      socket_count: 1,
    },
  ];
}

export function generateStats() {
  const sockets = generateMockSockets();
  const established = sockets.filter((s) => s.state === 'ESTABLISHED').length;
  const listening = sockets.filter((s) => s.state === 'LISTEN').length;
  const totalMemory = sockets.reduce((sum, s) => sum + s.memory_usage, 0);

  return {
    active_connections: established,
    listening_ports: listening,
    hung_connections: Math.floor(Math.random() * 3),
    memory_leaks_detected: Math.floor(Math.random() * 2),
    total_memory_usage: totalMemory,
  };
}
