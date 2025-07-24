import React from 'react';
import { Cpu, MemoryStick, Activity, Globe } from 'lucide-react';
import { ProcessData } from './Dashboard';

interface ProcessInfoProps {
  processes: ProcessData[];
  isLoading: boolean;
}

export function ProcessInfo({ processes, isLoading }: ProcessInfoProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400 bg-green-400/10';
      case 'sleeping': return 'text-blue-400 bg-blue-400/10';
      case 'stopped': return 'text-red-400 bg-red-400/10';
      case 'zombie': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Analyzing processes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Process Overview</h3>
        <p className="text-gray-400 text-sm">Resource usage and socket activity by process</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
        {processes.map((process) => (
          <div key={process.pid} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Activity className="w-5 h-5 text-blue-400 mr-2" />
                <div>
                  <h4 className="font-semibold text-white">{process.name}</h4>
                  <p className="text-sm text-gray-400">PID {process.pid}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(process.status)}`}>
                {process.status}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Globe className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-300">Sockets</span>
                </div>
                <span className="text-sm font-medium text-white">{process.socketCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MemoryStick className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-300">Memory</span>
                </div>
                <span className="text-sm font-medium text-white">{process.memoryUsage.toFixed(1)} MB</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cpu className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-300">CPU</span>
                </div>
                <span className="text-sm font-medium text-white">{process.cpuUsage.toFixed(1)}%</span>
              </div>

              {/* Resource usage bars */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Memory Usage</span>
                    <span>{process.memoryUsage.toFixed(1)} MB</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((process.memoryUsage / 200) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>CPU Usage</span>
                    <span>{process.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(process.cpuUsage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {processes.length === 0 && (
        <div className="px-6 py-12 text-center">
          <Cpu className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No processes found</h3>
          <p className="text-gray-500">Run a scan to analyze running processes</p>
        </div>
      )}
    </div>
  );
}