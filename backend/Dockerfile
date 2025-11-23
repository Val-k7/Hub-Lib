# Dockerfile pour Hub-Lib Backend API
# Image multi-stage pour production optimisée

# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci

# Générer le client Prisma
RUN npx prisma generate

# Copier le code source
COPY src ./src

# Build TypeScript
RUN npm run build

# =============================================================================
# Stage 2: Production
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Installer uniquement les dépendances de production
COPY package*.json ./
RUN npm ci --only=production

# Copier le client Prisma généré et les fichiers nécessaires
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Changer le propriétaire
RUN chown -R nodejs:nodejs /app

USER nodejs

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Commande de démarrage
CMD ["node", "dist/server.js"]


