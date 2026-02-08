# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all workspace dependencies
RUN npm ci

# Copy frontend source code
COPY frontend ./frontend

# Setup environment file (use example as template)
RUN cp frontend/src/app/environments/environment.example.ts frontend/src/app/environments/environment.ts

# Build the application
WORKDIR /app/frontend
RUN npm run build

# Stage 2: Production - Serve with nginx
FROM nginx:alpine

# Copy built application from builder stage
COPY --from=builder /app/frontend/dist/referee-lights-app/browser /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
