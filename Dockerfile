# ==========================================
# Stage 1: Build Frontend Assets
# ==========================================
FROM node:20-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend Dependencies
# ==========================================
FROM node:20-alpine AS server-builder

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

# ==========================================
# Stage 3: Production Release Image
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Copy server assets
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/package*.json ./server/
COPY server/src ./server/src

# Copy client assets
COPY --from=client-builder /app/client/dist ./client/dist
COPY client/package*.json ./client/
COPY client/serve.cjs ./client/

# Copy orchestration scripts
COPY start.js ./

# Set Environment Defaults
ENV NODE_ENV=production
ENV PORT=5004
ENV USE_MOCK_DB=false

# Expose Frontend (3004) and Backend (5004) ports
EXPOSE 3004
EXPOSE 5004

# Run under standard non-root alpine user for security
USER node

# Healthcheck targeting backend API health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:5004/api/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1));"

CMD ["node", "start.js"]
