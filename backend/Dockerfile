# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all workspace dependencies (including dev deps for build)
RUN npm ci

# Copy backend source code
COPY backend ./backend

# Build the application
WORKDIR /app/backend
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/backend/dist ./backend/dist

# Expose the port
EXPOSE 3000

# Start the application
WORKDIR /app/backend
CMD ["npm", "run", "start:prod"]
