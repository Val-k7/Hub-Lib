/**
 * Configuration globale pour les tests
 * Mock les variables d'environnement et autres dépendances
 */

// Mock des variables d'environnement avant l'import de env.ts
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'test_db';
process.env.POSTGRES_USER = 'test';
process.env.POSTGRES_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test_redis_password';
process.env.JWT_SECRET = 'test_jwt_secret_min_32_characters_long';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_min_32_characters_long';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.LOG_LEVEL = 'error'; // Réduire les logs pendant les tests

