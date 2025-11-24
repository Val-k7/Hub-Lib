/**
 * Configuration de la base de données PostgreSQL avec Prisma
 */

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Singleton Prisma Client
let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

if (env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  // En développement, utiliser un singleton global pour éviter les multiples instances
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

// Connexion à la base de données
// En mode test, ne pas faire exit(1) pour permettre les tests de continuer
if (env.NODE_ENV !== 'test') {
  prisma.$connect().catch((error) => {
    logger.error('Erreur de connexion à PostgreSQL', error);
    process.exit(1);
  });
} else {
  // En mode test, connecter sans exit
  prisma.$connect().catch((error) => {
    logger.warn('Erreur de connexion à PostgreSQL en mode test (peut être normal):', error);
  });
}

// Gestion de la fermeture propre
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };



