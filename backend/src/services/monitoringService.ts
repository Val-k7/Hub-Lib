/**
 * Service de monitoring et alerting
 * Collecte des métriques système et envoie des alertes en cas de problème
 */

import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { emailService } from './emailService.js';
import { queueService, JobType } from './queueService.js';
import { env } from '../config/env.js';
import { Gauge, Counter } from 'prom-client';
import { register } from '../utils/metrics.js';

// Métriques système
const dbConnectionsGauge = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

const dbQueryDuration = new Gauge({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  registers: [register],
});

const redisConnectionsGauge = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections',
  registers: [register],
});

const redisMemoryUsage = new Gauge({
  name: 'redis_memory_usage_bytes',
  help: 'Redis memory usage in bytes',
  registers: [register],
});

const systemMemoryUsage = new Gauge({
  name: 'system_memory_usage_bytes',
  help: 'System memory usage in bytes',
  registers: [register],
});

const systemCpuUsage = new Gauge({
  name: 'system_cpu_usage_percent',
  help: 'System CPU usage percentage',
  registers: [register],
});

const alertCounter = new Counter({
  name: 'alerts_total',
  help: 'Total number of alerts sent',
  labelNames: ['severity', 'type'],
  registers: [register],
});

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: number;
  timestamp: Date;
}

interface SystemMetrics {
  database: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    connections: number;
    queryTime: number;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    connections: number;
    memoryUsage: number;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    uptime: number;
  };
  timestamp: Date;
}

class MonitoringService {
  private alertThresholds = {
    dbLatency: 1000, // ms
    redisLatency: 100, // ms
    memoryUsage: 90, // %
    cpuUsage: 90, // %
    errorRate: 5, // %
  };

  private lastAlertTime: Map<string, number> = new Map();
  private alertCooldown = 5 * 60 * 1000; // 5 minutes

  /**
   * Vérifie la santé de tous les services
   */
  async checkHealth(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Vérifier PostgreSQL
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);

    // Vérifier Redis
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);

    return checks;
  }

  /**
   * Vérifie la santé de la base de données
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      dbConnectionsGauge.set(1); // Approximation
      dbQueryDuration.set({ operation: 'health_check' }, latency / 1000);

      if (latency > this.alertThresholds.dbLatency) {
        await this.sendAlert('warning', 'database', `Latence élevée: ${latency}ms`);
        return {
          service: 'database',
          status: 'degraded',
          message: `Latence élevée: ${latency}ms`,
          latency,
          timestamp: new Date(),
        };
      }

      return {
        service: 'database',
        status: 'healthy',
        latency,
        timestamp: new Date(),
      };
    } catch (error) {
      await this.sendAlert('critical', 'database', `Erreur de connexion: ${error instanceof Error ? error.message : String(error)}`);
      return {
        service: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Vérifie la santé de Redis
   */
  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await redis.ping();
      const latency = Date.now() - start;

      redisConnectionsGauge.set(1); // Approximation

      if (latency > this.alertThresholds.redisLatency) {
        await this.sendAlert('warning', 'redis', `Latence élevée: ${latency}ms`);
        return {
          service: 'redis',
          status: 'degraded',
          message: `Latence élevée: ${latency}ms`,
          latency,
          timestamp: new Date(),
        };
      }

      // Obtenir les informations Redis
      try {
        const info = await redis.info('memory');
        const memoryMatch = info.match(/used_memory:(\d+)/);
        if (memoryMatch) {
          redisMemoryUsage.set(parseInt(memoryMatch[1], 10));
        }
      } catch {
        // Ignorer les erreurs d'info
      }

      return {
        service: 'redis',
        status: 'healthy',
        latency,
        timestamp: new Date(),
      };
    } catch (error) {
      await this.sendAlert('critical', 'redis', `Erreur de connexion: ${error instanceof Error ? error.message : String(error)}`);
      return {
        service: 'redis',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Collecte les métriques système
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    systemMemoryUsage.set(usedMemory);

    // CPU usage (approximation basée sur l'uptime)
    const cpuUsage = process.cpuUsage();
    const cpuPercentage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convertir en secondes
    systemCpuUsage.set(cpuPercentage);

    const dbHealth = await this.checkDatabase();
    const redisHealth = await this.checkRedis();

    // Obtenir les infos Redis
    let redisMemory = 0;
    try {
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        redisMemory = parseInt(memoryMatch[1], 10);
      }
    } catch {
      // Ignorer
    }

    return {
      database: {
        status: dbHealth.status,
        connections: 1, // Approximation
        queryTime: dbHealth.latency || 0,
      },
      redis: {
        status: redisHealth.status,
        connections: 1, // Approximation
        memoryUsage: redisMemory,
      },
      system: {
        memory: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryPercentage,
        },
        cpu: {
          usage: cpuPercentage,
        },
        uptime: process.uptime(),
      },
      timestamp: new Date(),
    };
  }

  /**
   * Envoie une alerte
   */
  private async sendAlert(severity: 'info' | 'warning' | 'critical', type: string, message: string): Promise<void> {
    const alertKey = `${severity}:${type}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(alertKey) || 0;

    // Éviter le spam d'alertes
    if (now - lastAlert < this.alertCooldown) {
      return;
    }

    this.lastAlertTime.set(alertKey, now);
    alertCounter.inc({ severity, type });

    logger.warn(`[ALERT ${severity.toUpperCase()}] ${type}: ${message}`);

    // En production, envoyer un email pour les alertes critiques
    if (env.NODE_ENV === 'production' && severity === 'critical') {
      try {
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
        if (adminEmails.length > 0) {
          for (const email of adminEmails) {
            await queueService.addJob(JobType.EMAIL, {
              to: email.trim(),
              subject: `[Hub-Lib] Alerte ${severity}: ${type}`,
              template: 'NOTIFICATION',
              data: {
                title: `Alerte ${severity}: ${type}`,
                message,
                severity,
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      } catch (error) {
        logger.error('Erreur lors de l\'envoi de l\'alerte par email', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Vérifie les seuils et envoie des alertes si nécessaire
   */
  async checkThresholds(): Promise<void> {
    const metrics = await this.collectSystemMetrics();

    // Vérifier l'utilisation mémoire
    if (metrics.system.memory.percentage > this.alertThresholds.memoryUsage) {
      await this.sendAlert(
        'warning',
        'memory',
        `Utilisation mémoire élevée: ${metrics.system.memory.percentage.toFixed(2)}%`
      );
    }

    // Vérifier l'utilisation CPU
    if (metrics.system.cpu.usage > this.alertThresholds.cpuUsage) {
      await this.sendAlert(
        'warning',
        'cpu',
        `Utilisation CPU élevée: ${metrics.system.cpu.usage.toFixed(2)}%`
      );
    }

    // Vérifier la latence de la base de données
    if (metrics.database.queryTime > this.alertThresholds.dbLatency) {
      await this.sendAlert(
        'warning',
        'database',
        `Latence base de données élevée: ${metrics.database.queryTime}ms`
      );
    }

    // Vérifier le statut des services
    if (metrics.database.status === 'unhealthy') {
      await this.sendAlert('critical', 'database', 'Base de données inaccessible');
    }

    if (metrics.redis.status === 'unhealthy') {
      await this.sendAlert('critical', 'redis', 'Redis inaccessible');
    }
  }

  /**
   * Démarre le monitoring périodique
   */
  startMonitoring(intervalMs: number = 60000): void {
    logger.info(`Démarrage du monitoring (intervalle: ${intervalMs}ms)`);

    setInterval(async () => {
      try {
        await this.checkThresholds();
      } catch (error) {
        logger.error('Erreur lors de la vérification des seuils', error instanceof Error ? error : new Error(String(error)));
      }
    }, intervalMs);
  }
}

export const monitoringService = new MonitoringService();

