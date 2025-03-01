# Build frontend
FROM node:18-alpine as frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build and run backend
FROM node:18-alpine
WORKDIR /app

# Install backend dependencies
COPY api/package*.json ./
RUN npm install --production

# Copy backend files
COPY api/ .

# Copy built frontend files to root path
COPY --from=frontend-builder /frontend/dist ./public

# Add API base path configuration
ENV API_BASE_PATH=/api

EXPOSE 3000
CMD ["npm", "start"]