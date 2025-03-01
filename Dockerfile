# Build frontend
FROM node:18-alpine as frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build backend and serve frontend
FROM node:18-alpine
WORKDIR /app

# Install backend dependencies
COPY api/package*.json ./
RUN npm install --production

# Copy backend files
COPY api/ .

# Copy built frontend files to public directory
COPY --from=frontend-builder /frontend/dist /app/public

EXPOSE 3000
CMD ["npm", "start"]