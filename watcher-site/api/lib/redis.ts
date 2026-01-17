import { Redis } from '@upstash/redis'

// Initialize Redis client from environment variables
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set
export const redis = Redis.fromEnv()

export const INSTALL_COUNT_KEY = 'watcher:install_count'
