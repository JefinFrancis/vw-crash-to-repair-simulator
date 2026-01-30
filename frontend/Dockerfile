# Multi-stage Dockerfile for VW Crash-to-Repair Simulator Frontend
# React + TypeScript + Vite

# =============================================================================
# Base Stage - Node.js setup
# =============================================================================
FROM node:18-alpine as base

# Set environment variables
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl

# Create app directory
WORKDIR /app

# =============================================================================
# Dependencies Stage
# =============================================================================
FROM base as deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# =============================================================================
# Development Stage
# =============================================================================
FROM base as development

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Development command (will be overridden by docker-compose)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# =============================================================================
# Build Stage
# =============================================================================
FROM base as build

# Set production environment
ENV NODE_ENV=production

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build application
RUN npm run build

# =============================================================================
# Production Stage
# =============================================================================
FROM nginx:alpine as production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S vwapp && \
    adduser -S vwapp -u 1001

# Set ownership
RUN chown -R vwapp:vwapp /usr/share/nginx/html && \
    chown -R vwapp:vwapp /var/cache/nginx && \
    chown -R vwapp:vwapp /var/log/nginx && \
    chown -R vwapp:vwapp /etc/nginx/conf.d

# Switch to non-root user
USER vwapp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]