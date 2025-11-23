/**
 * Configuration de Redis
 */

import Redis from 'ioredis';
import { env } from './env.js';

// Singleton Redis Client
let redis: Redis;

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

const createRedisClient = (): Redis => {
  const options: Redis.RedisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    // Configuration de pooling
    enableOfflineQueue: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    // Keep-alive
    keepAlive: 30000,
    // Options de performance
    enableAutoPipelining: true,
    maxLoadingTimeout: 5000,
  };

  return new Redis(options);
};

if (env.NODE_ENV === 'production') {
  redis = createRedisClient();
} else {
  // En développement, utiliser un singleton global
  if (!global.__redis) {
    global.__redis = createRedisClient();
  }
  redis = global.__redis;
}

// Gestion des erreurs Redis
redis.on('error', (error) => {
  console.error('❌ Erreur Redis:', error);
});

redis.on('connect', () => {
  console.log('✅ Connecté à Redis');
});

redis.on('ready', () => {
  console.log('✅ Redis prêt');
});

// Gestion de la fermeture propre
process.on('beforeExit', async () => {
  await redis.quit();
});

export { redis };

