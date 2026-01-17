import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redis, INSTALL_COUNT_KEY } from './lib/redis'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const count = await redis.get<number>(INSTALL_COUNT_KEY) || 0

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate')
    res.status(200).json({ installs: count })
  } catch (error) {
    console.error('Error fetching install count:', error)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
}
