/**
 * Configuration de Redis
 */

import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import type { RedisOptions } from '../types/common.js';

// Singleton Redis Client
let redis: Redis;

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

const createRedisClient = (): Redis => {
  const options: RedisOptions = {
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
  logger.error('Erreur Redis', error);
});

redis.on('connect', () => {
  logger.info('Connecté à Redis');
});

redis.on('ready', () => {
  logger.info('Redis prêt');
});

// Gestion de la fermeture propre
process.on('beforeExit', async () => {
  await redis.quit();
});

// Créer un client Redis séparé pour les subscriptions (nécessaire pour Socket.IO)
let redisSubscriber: Redis;

if (env.NODE_ENV === 'production') {
  redisSubscriber = createRedisClient();
} else {
  // En développement, utiliser un singleton global
  if (!global.__redisSubscriber) {
    global.__redisSubscriber = createRedisClient();
  }
  redisSubscriber = global.__redisSubscriber;
}

declare global {
  // eslint-disable-next-line no-var
  var __redisSubscriber: Redis | undefined;
}

export { redis, redisSubscriber };

