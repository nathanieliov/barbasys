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

# Install only production dependencies for better performance
# Install better-sqlite3 dependencies (may be needed if not pre-built)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy root package.json
COPY package*.json ./

# Copy built shared package
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/package.json

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose the API port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# The barbasys.db will be created in /app/backend/barbasys.db 
# unless overridden by DATABASE_URL. 
# It's recommended to mount a volume to /app/backend

WORKDIR /app/backend
CMD ["npm", "start"]
