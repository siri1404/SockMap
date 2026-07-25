import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateMockMemory } from './mockData.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const memory_segments = generateMockMemory();

  res.status(200).json({
    memory_segments,
    total_segments: memory_segments.length,
    timestamp: new Date().toISOString(),
  });
}
