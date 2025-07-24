import React from 'react';
import { HardDrive, Lock, Share2, User } from 'lucide-react';
import { MemorySegment } from './Dashboard';

interface MemoryMapProps {
  segments: MemorySegment[];
  isLoading: boolean;
}

export function MemoryMap({ segments, isLoading }: MemoryMapProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'heap': return 'text-green-400 bg-green-400/10';
      case 'stack': return 'text-blue-400 bg-blue-400/10';
      case 'code': return 'text-purple-400 bg-purple-400/10';
      case 'data': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Mapping memory segments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Memory Mapping</h3>
        <p className="text-gray-400 text-sm">Virtual memory segments and their allocations</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Process
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Sharing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {segments.map((segment) => (
              <tr key={segment.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-white">PID {segment.pid}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-sm text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                    {segment.address}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {formatSize(segment.size)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {segment.permissions.includes('r') && <Lock className="w-3 h-3 text-green-400 mr-1" />}
                    {segment.permissions.includes('w') && <Lock className="w-3 h-3 text-yellow-400 mr-1" />}
                    {segment.permissions.includes('x') && <Lock className="w-3 h-3 text-red-400 mr-1" />}
                    <code className="text-sm text-gray-300 ml-2">{segment.permissions}</code>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(segment.type)}`}>
                    <HardDrive className="w-3 h-3 mr-1" />
                    {segment.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {segment.isShared ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">
                      <Share2 className="w-3 h-3 mr-1" />
                      Shared
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-400/10 text-gray-400">
                      <User className="w-3 h-3 mr-1" />
                      Private
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {segments.length === 0 && (
        <div className="px-6 py-12 text-center">
          <HardDrive className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No memory segments found</h3>
          <p className="text-gray-500">Run a scan to analyze memory mappings</p>
        </div>
      )}
    </div>
  );
}