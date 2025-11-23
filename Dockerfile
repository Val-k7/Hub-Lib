# Multi-stage build optimisé pour Hub-Lib Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copier uniquement les fichiers nécessaires pour installer les dépendances
COPY package*.json ./

# Installer les dépendances (avec legacy-peer-deps pour résoudre les conflits Storybook)
RUN npm ci --legacy-peer-deps

# Installer terser comme dépendance (requis par Vite pour la minification en production)
RUN npm install --save-dev terser --legacy-peer-deps

# Copier les fichiers de configuration nécessaires au build
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY index.html ./

# Copier le code source
COPY src/ ./src/
COPY public/ ./public/

# Variables d'environnement pour le build (peuvent être surchargées au build)
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Build de l'application
RUN npm run build

# Stage de production - Nginx pour servir les fichiers statiques
FROM nginx:alpine

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier la configuration Nginx
COPY docker/nginx/nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Exposer le port 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]

