# Frontend Dockerfile for Vite React app (planning-vite)

# --- Build stage ---
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN chmod +x node_modules/.bin/* && npm run build:prod

# --- Production stage ---
FROM nginx:1.27-alpine AS production

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the port nginx listens on
EXPOSE 80

# Default nginx startup
CMD ["nginx", "-g", "daemon off;"]
