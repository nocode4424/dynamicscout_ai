# Multi-stage build for DynamicScout AI

# Base Node.js stage
FROM node:18-alpine AS node-base
WORKDIR /app
ENV NODE_ENV=production

# Backend build stage
FROM node-base AS backend-build
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Frontend build stage
FROM node-base AS frontend-build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

# Python base stage
FROM python:3.10-slim AS python-base
WORKDIR /app
ENV PYTHONPATH=/app

# Scraper build stage
FROM python-base AS scraper-build
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome for headless browser capabilities
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY scraper/requirements.txt ./scraper/
RUN pip install --no-cache-dir -r scraper/requirements.txt

# Backend final stage
FROM node-base AS backend
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "server.js"]

# Frontend final stage using Nginx
FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/frontend/build /usr/share/nginx/html
COPY deployment/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Scraper final stage
FROM scraper-build AS scraper
COPY scraper ./scraper
WORKDIR /app
CMD ["python", "-m", "scraper.main"]
