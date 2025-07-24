import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Globe, Wifi } from 'lucide-react';
import { SocketData } from './Dashboard';

interface SocketListProps {
  sockets: SocketData[];
  isLoading: boolean;
}

export function SocketList({ sockets, isLoading }: SocketListProps) {
  const getStateColor = (state: string) => {
    switch (state) {
      case 'ESTABLISHED': return 'text-green-400 bg-green-400/10';
      case 'LISTENING': return 'text-blue-400 bg-blue-400/10';
      case 'TIME_WAIT': return 'text-yellow-400 bg-yellow-400/10';
      case 'CLOSE_WAIT': return 'text-orange-400 bg-orange-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'ESTABLISHED': return CheckCircle;
      case 'LISTENING': return Wifi;
      case 'TIME_WAIT': return Clock;
      default: return Globe;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Scanning sockets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Socket Connections</h3>
        <p className="text-gray-400 text-sm">Real-time monitoring of active socket connections</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Process
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Local Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Remote Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                State
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Protocol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Memory
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sockets.map((socket) => {
              const StateIcon = getStateIcon(socket.state);
              return (
                <tr key={socket.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-white">{socket.processName}</div>
                        <div className="text-sm text-gray-400">PID: {socket.pid}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {socket.localAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {socket.remoteAddress || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStateColor(socket.state)}`}>
                      <StateIcon className="w-3 h-3 mr-1" />
                      {socket.state}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {socket.protocol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {(socket.memoryUsage / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {socket.isHung && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Hung
                        </span>
                      )}
                      {socket.hasLeak && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-400/10 text-red-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Leak
                        </span>
                      )}
                      {!socket.isHung && !socket.hasLeak && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-400/10 text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          OK
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sockets.length === 0 && (
        <div className="px-6 py-12 text-center">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No sockets found</h3>
          <p className="text-gray-500">Run a scan to detect active socket connections</p>
        </div>
      )}
    </div>
  );
}