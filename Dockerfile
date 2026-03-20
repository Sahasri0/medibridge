# Multi-stage Dockerfile for efficiency and security

# Stage 1: Build
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Production
FROM node:18-slim
WORKDIR /app

# Improve non-root security
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Copy only what's needed for production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/index.html ./

# Set permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
