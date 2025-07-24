import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Database, Globe, HardDrive, RefreshCw, Search, Filter } from 'lucide-react';
import { apiService, TraceData } from '../services/api';
import { SocketList } from './SocketList';
import { MemoryMap } from './MemoryMap';
import { ProcessInfo } from './ProcessInfo';
import { StatsCards } from './StatsCards';

export interface SocketData {
  id: string;
  pid: number;
  processName: string;
  localAddress: string;
  remoteAddress: string;
  state: 'ESTABLISHED' | 'LISTENING' | 'TIME_WAIT' | 'CLOSE_WAIT' | 'SYN_SENT' | 'SYN_RECV';
  protocol: 'TCP' | 'UDP';
  memoryUsage: number;
  isHung: boolean;
  hasLeak: boolean;
  timestamp: string;
}

export interface MemorySegment {
  id: string;
  pid: number;
  address: string;
  size: number;
  permissions: string;
  type: string;
  isShared: boolean;
}

export interface ProcessData {
  pid: number;
  name: string;
  socketCount: number;
  memoryUsage: number;
  cpuUsage: number;
  status: string;
}

export function Dashboard() {
  const [sockets, setSockets] = useState<SocketData[]>([]);
  const [memorySegments, setMemorySegments] = useState<MemorySegment[]>([]);
  const [processes, setProcesses] = useState<ProcessData[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'sockets' | 'memory' | 'processes'>('sockets');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const response = await apiService.traceSockets();
      
      if (response.error) {
        console.error('Backend error:', response.error);
        setError(`Backend connection failed: ${response.error}`);
        setConnectionStatus('disconnected');
        // Clear data on error
        setSockets([]);
        setMemorySegments([]);
        setProcesses([]);
      } else if (response.data) {
        setConnectionStatus('connected');
        // Transform backend data to frontend format
        const transformedSockets: SocketData[] = response.data.sockets.map((socket, index) => ({
          id: `${socket.pid}-${index}`,
          pid: socket.pid,
          processName: socket.process_name,
          localAddress: socket.local_address,
          remoteAddress: socket.remote_address,
          state: socket.state as any,
          protocol: socket.protocol as any,
          memoryUsage: socket.memory_usage,
          isHung: socket.is_hung,
          hasLeak: socket.has_leak,
          timestamp: new Date(response.data.timestamp * 1000).toISOString(),
        }));
        
        const transformedMemory: MemorySegment[] = response.data.memory.map((mem, index) => ({
          id: `${mem.pid}-${index}`,
          pid: mem.pid,
          address: mem.address,
          size: mem.size,
          permissions: mem.permissions,
          type: mem.type,
          isShared: mem.is_shared,
        }));
        
        const transformedProcesses: ProcessData[] = response.data.processes.map(proc => ({
          pid: proc.pid,
          name: proc.name,
          socketCount: proc.socket_count,
          memoryUsage: proc.memory_usage,
          cpuUsage: proc.cpu_usage,
          status: proc.status,
        }));
        
        setSockets(transformedSockets);
        setMemorySegments(transformedMemory);
        setProcesses(transformedProcesses);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setError(`Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConnectionStatus('disconnected');
      // Clear data on error
      setSockets([]);
      setMemorySegments([]);
      setProcesses([]);
    }
    
    setLastUpdate(new Date());
    setIsScanning(false);
  };

  useEffect(() => {
    const checkHealth = async () => {
      const health = await apiService.healthCheck();
      if (health.error) {
        setConnectionStatus('disconnected');
        setError(`Backend connection failed: ${health.error}`);
      } else {
        setConnectionStatus('connected');
        setError(null);
      }
    };
    
    checkHealth();
    runScan();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      runScan();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredSockets = sockets.filter(socket =>
    socket.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    socket.localAddress.includes(searchTerm) ||
    socket.remoteAddress.includes(searchTerm) ||
    socket.pid.toString().includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">SockMap</h1>
              <p className="text-gray-400 text-sm">Real-time Socket & Memory Monitor</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' : 
                connectionStatus === 'disconnected' ? 'bg-red-400' : 
                'bg-yellow-400'
              }`}></div>
              <span className="text-xs text-gray-400">
                {connectionStatus === 'connected' ? 'Backend Connected' : 
                 connectionStatus === 'disconnected' ? 'Backend Disconnected' : 
                 'Checking Connection'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-300">
                Auto-refresh
              </label>
            </div>
            
            <button
              onClick={runScan}
              disabled={isScanning}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Last Update */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>Last updated:</span>
            <span className="text-blue-400">{lastUpdate.toLocaleTimeString()}</span>
            {error && (
              <span className="text-yellow-400 ml-4">⚠ {error}</span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sockets, processes, or addresses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 w-80 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-6 py-6">
        <StatsCards sockets={sockets} processes={processes} />
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6">
        {/* Tabs */}
        <div className="border-b border-gray-800 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'sockets', label: 'Socket Monitoring', icon: Globe },
              { id: 'memory', label: 'Memory Mapping', icon: HardDrive },
              { id: 'processes', label: 'Process Overview', icon: Cpu },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    selectedTab === tab.id
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {selectedTab === 'sockets' && <SocketList sockets={filteredSockets} isLoading={isScanning} />}
        {selectedTab === 'memory' && <MemoryMap segments={memorySegments} isLoading={isScanning} />}
        {selectedTab === 'processes' && <ProcessInfo processes={processes} isLoading={isScanning} />}
      </div>
    </div>
  );
}