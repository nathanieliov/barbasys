# Build Stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy root package.json and lockfile
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies for all packages
RUN npm install

# Copy source code
COPY . .

# Build all packages
RUN npm run build

# Runtime Stage
FROM node:20-slim

WORKDIR /app

# Install native dependencies for better-sqlite3 (runtime may need these if re-compiling occurs, 
# but usually just the shared libs are enough. However, node:slim is very minimal)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy root package.json and workspace package.jsons to maintain structure
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Copy built shared package
COPY --from=builder /app/shared/dist ./shared/dist

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist

# Copy all node_modules (hoisted at root)
COPY --from=builder /app/node_modules ./node_modules

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

# Expose the API port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start from backend directory
WORKDIR /app/backend
CMD ["npm", "start"]
