# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### 1. Start the Application

**Using Docker Compose (Recommended):**
```bash
docker-compose up -d
```

**Or use the start script:**
```bash
./docker-start.sh
```

**Or use Make:**
```bash
make up
```

### 2. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### 3. Create Your First Passkey

1. Click "Don't have an account? Register"
2. Create a username and password
3. Login with your credentials
4. Click "Add Passkey"
5. Follow your browser prompts (Touch ID, Face ID, etc.)
6. Done! You can now login with your passkey

---

## 📋 Common Commands

### Docker Management

```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Check status
docker-compose ps

# Rebuild
docker-compose up --build -d
```

### Using Make

```bash
make help      # Show all available commands
make up        # Start application
make down      # Stop application
make logs      # View logs
make restart   # Restart application
make backup    # Backup database
```

---

## 🔧 Troubleshooting

### Port Already in Use

If port 3000 is already in use, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Change to any available port
```

### Database Issues

```bash
# Stop the app
docker-compose down

# Remove database and restart fresh
rm -rf data/*.db
docker-compose up -d
```

### View Detailed Logs

```bash
docker-compose logs -f webauthn-app
```

---

## 📁 Data Persistence

Your SQLite database is stored in the `./data` directory on your host machine. This means:

- ✅ Data persists between container restarts
- ✅ You can backup the `./data` folder
- ✅ Easy to migrate to a new host

### Backup Your Data

```bash
# Manual backup
cp -r ./data ./data-backup

# Or use make
make backup
```

---

## 🌐 Production Deployment

For production deployment, update `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - WEBAUTHN_RP_ID=yourdomain.com          # Your domain
  - WEBAUTHN_RP_NAME=Your App Name          # Your app name
  - WEBAUTHN_ORIGIN=https://yourdomain.com  # Full HTTPS URL
```

**Additional steps:**

1. **Enable HTTPS** - WebAuthn requires HTTPS in production
2. **Use reverse proxy** - Nginx, Traefik, or Caddy
3. **Set environment variables** - Update the values above

**No code changes needed!** Everything is configured via environment variables.

See [DOCKER.md](DOCKER.md) for detailed production deployment guide.

---

## 📚 Documentation

- [README.md](README.md) - Full documentation
- [DOCKER.md](DOCKER.md) - Docker deployment guide
- [.env.example](.env.example) - Environment variables

---

## 🆘 Need Help?

1. Check the debug panel in the app (bottom-right corner)
2. View logs: `docker-compose logs -f`
3. Ensure WebAuthn is supported in your browser
4. Try the authentication flow step by step

---

## 🎯 Next Steps

- Add multiple passkeys
- Test passkey authentication
- Try different browsers
- Check the debug logs
- Explore the API endpoints
