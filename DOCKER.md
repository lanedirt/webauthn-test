# Docker Deployment Guide

This guide explains how to deploy the WebAuthn Test application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

1. **Build and run the application:**

   ```bash
   docker-compose up -d
   ```

2. **Access the application:**

   Open your browser and navigate to `http://localhost:3000`

3. **View logs:**

   ```bash
   docker-compose logs -f webauthn-app
   ```

4. **Stop the application:**

   ```bash
   docker-compose down
   ```

## Database Persistence

The SQLite database is persisted using a bind mount to the local `./data` directory. This means:

- The database file is stored on your host machine in the `./data` folder
- Data persists even when containers are stopped or removed
- You can backup the database by copying the `./data` directory

## Configuration

### Environment Variables

The application supports the following environment variables in `docker-compose.yml`:

#### Application Settings
```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
```

#### WebAuthn Configuration

**For localhost/development:**
```yaml
environment:
  - WEBAUTHN_RP_ID=localhost
  - WEBAUTHN_RP_NAME=WebAuthn Test Demo
  - WEBAUTHN_ORIGIN=http://localhost:3200
```

**For production deployment:**
```yaml
environment:
  - WEBAUTHN_RP_ID=yourdomain.com
  - WEBAUTHN_RP_NAME=Your App Name
  - WEBAUTHN_ORIGIN=https://yourdomain.com
```

**Environment Variable Descriptions:**

- `WEBAUTHN_RP_ID`: The Relying Party ID (usually your domain name without protocol)
  - Localhost: `localhost`
  - Production: `yourdomain.com` or `app.yourdomain.com`

- `WEBAUTHN_RP_NAME`: Human-readable name displayed during passkey creation
  - Example: `My Awesome App`

- `WEBAUTHN_ORIGIN`: Full URL with protocol where your app is hosted
  - Development: `http://localhost:3200`
  - Production: `https://yourdomain.com`

**Important Notes:**
- The `WEBAUTHN_RP_ID` must match the domain where your app is hosted
- Passkeys registered with one `RP_ID` cannot be used with a different one
- Always use HTTPS in production (`https://` in `WEBAUTHN_ORIGIN`)

### Port Mapping

To change the port the application runs on, modify the `ports` section in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Access the app on port 8080
```

## Building for Production

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up --build -d

# Rebuild only
docker-compose build
```

### Using Docker CLI

```bash
# Build the image
docker build -t webauthn-test .

# Run the container
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name webauthn-test \
  webauthn-test
```

## Health Check

The container includes a health check that runs every 30 seconds to ensure the application is responding:

```bash
# Check container health
docker-compose ps

# Or with Docker CLI
docker ps
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs webauthn-app

# Check if port is already in use
lsof -i :3000
```

### Database permission issues

```bash
# Ensure data directory has correct permissions
chmod 755 ./data
```

### Rebuild from scratch

```bash
# Remove containers, volumes, and rebuild
docker-compose down -v
docker-compose up --build -d
```

## Production Considerations

### HTTPS/TLS

WebAuthn requires HTTPS in production. Use a reverse proxy like:

- **Nginx**
- **Traefik**
- **Caddy**

Example Nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Environment Configuration

Configure WebAuthn for production by updating the environment variables in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - WEBAUTHN_RP_ID=yourdomain.com
  - WEBAUTHN_RP_NAME=Your App Name
  - WEBAUTHN_ORIGIN=https://yourdomain.com
```

**Important:** No code changes needed! All WebAuthn configuration is now controlled via environment variables.

### Backup Strategy

Regular database backups are recommended:

```bash
# Create backup
cp -r ./data ./data-backup-$(date +%Y%m%d)

# Or use tar
tar -czf webauthn-backup-$(date +%Y%m%d).tar.gz ./data
```

## Docker Compose with Nginx

Example `docker-compose.yml` with Nginx reverse proxy:

```yaml
version: '3.8'

services:
  webauthn-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: webauthn-test
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WEBAUTHN_RP_ID=yourdomain.com
      - WEBAUTHN_RP_NAME=Your App Name
      - WEBAUTHN_ORIGIN=https://yourdomain.com
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    networks:
      - webauthn-network

  nginx:
    image: nginx:alpine
    container_name: webauthn-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - webauthn-app
    restart: unless-stopped
    networks:
      - webauthn-network

networks:
  webauthn-network:
    driver: bridge
```

## Monitoring

### Resource Usage

```bash
# View resource usage
docker stats webauthn-test

# Or with docker-compose
docker-compose stats
```

### Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f webauthn-app
```
