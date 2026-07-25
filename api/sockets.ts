import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateMockSockets, generateStats } from './mockData.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sockets = generateMockSockets();
  const stats = generateStats();

  res.status(200).json({
    sockets,
    stats,
    timestamp: new Date().toISOString(),
  });
}
