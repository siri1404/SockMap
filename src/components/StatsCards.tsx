import React from 'react';
import { Activity, AlertTriangle, Database, Users } from 'lucide-react';
import { SocketData, ProcessData } from './Dashboard';

interface StatsCardsProps {
  sockets: SocketData[];
  processes: ProcessData[];
}

export function StatsCards({ sockets, processes }: StatsCardsProps) {
  const activeConnections = sockets.filter(s => s.state === 'ESTABLISHED').length;
  const listeningPorts = sockets.filter(s => s.state === 'LISTENING').length;
  const hungConnections = sockets.filter(s => s.isHung).length;
  const memoryLeaks = sockets.filter(s => s.hasLeak).length;
  const totalMemoryUsage = sockets.reduce((acc, s) => acc + s.memoryUsage, 0);

  const stats = [
    {
      title: 'Active Connections',
      value: activeConnections,
      icon: Activity,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      title: 'Listening Ports',
      value: listeningPorts,
      icon: Database,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      title: 'Hung Connections',
      value: hungConnections,
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
    {
      title: 'Memory Leaks',
      value: memoryLeaks,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.title} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}