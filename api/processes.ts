import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateMockProcesses } from './mockData.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const processes = generateMockProcesses();

  res.status(200).json({
    processes,
    total_processes: processes.length,
    timestamp: new Date().toISOString(),
  });
}
