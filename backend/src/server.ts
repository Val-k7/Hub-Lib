/**
 * Point d'entrée principal du serveur Express
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { initializeSocketServer } from './socket/server.js';

// Créer l'application Express
const app = express();

// Créer le serveur HTTP pour Socket.IO
const httpServer = createServer(app);

// Middleware de sécurité
// Configuration Helmet pour HTTPS
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginEmbedderPolicy: false, // Peut causer des problèmes avec certaines intégrations
  originAgentCluster: true,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS
const corsOptions = {
  origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de métriques (avant les routes)
app.use(metricsMiddleware);

// Health check endpoints
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: '1.0.0',
  });
});

// Métriques Prometheus
import { register } from './utils/metrics.js';
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end('Erreur lors de la récupération des métriques');
  }
});

// Route principale
app.get('/', (_req, res) => {
  res.json({
    message: 'Hub-Lib API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Import des routes
import authRoutes from './routes/auth.js';
import resourceRoutes from './routes/resources.js';
import profileRoutes from './routes/profiles.js';
import collectionRoutes from './routes/collections.js';
import commentRoutes from './routes/comments.js';
import groupRoutes from './routes/groups.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import suggestionRoutes from './routes/suggestions.js';
import analyticsRoutes from './routes/analytics.js';
import migrationRoutes from './routes/migration.js';
import apiTokenRoutes from './routes/apiTokens.js';
import categoryRoutes from './routes/categories.js';
import fileRoutes from './routes/files.js';
import backupRoutes from './routes/backups.js';
import monitoringRoutes from './routes/monitoring.js';
import oauthAccountsRoutes from './routes/oauthAccounts.js';
import githubRoutes from './routes/github.js';
import googleDriveRoutes from './routes/googleDrive.js';
import templateRoutes from './routes/templates.js';
import permissionRoutes from './routes/permissions.js';
import { errorHandler } from './middleware/errorHandler.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { queueService } from './services/queueService.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { monitoringService } from './services/monitoringService.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/api-tokens', apiTokenRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/oauth-accounts', oauthAccountsRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/google-drive', googleDriveRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/permissions', permissionRoutes);

// Documentation Swagger/OpenAPI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hub-Lib API Documentation',
  customfavIcon: '/favicon.ico',
}));

// Endpoint JSON pour la spécification OpenAPI
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: _req.path,
  });
});

// Error Handler global (doit être le dernier middleware)
app.use(errorHandler);

// Initialiser les queues Redis
queueService.initialize();

// Initialiser Socket.IO
initializeSocketServer(httpServer);

// Démarrer le monitoring
if (env.NODE_ENV === 'production') {
  monitoringService.startMonitoring(60000); // Vérifier toutes les minutes
  logger.info('📊 Monitoring démarré');
}

// Démarrer le serveur HTTP (Express + Socket.IO)
const PORT = env.PORT;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
  logger.info(`📍 Environnement: ${env.NODE_ENV}`);
  logger.info(`🌐 API Base URL: ${env.API_BASE_URL}`);
  logger.info(`📦 Queues Redis initialisées`);
  logger.info(`🔌 Socket.IO initialisé`);
});

// Gestion de la fermeture propre
process.on('SIGTERM', async () => {
  logger.info('SIGTERM reçu, fermeture du serveur...');
  await queueService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT reçu, fermeture du serveur...');
  await queueService.close();
  process.exit(0);
});

export default app;
export { httpServer };

