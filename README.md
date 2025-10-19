# WebAuthn Passkey Demo

A comprehensive Next.js application for testing and debugging WebAuthn passkey authentication. This demo allows users to create accounts, register passkeys, and test authentication flows with detailed debugging information.

> **Quick Start**: New to this project? See [QUICKSTART.md](QUICKSTART.md) for a 3-step guide to get running immediately!

## Features

- **User Registration & Login**: Create accounts with username/password
- **Passkey Management**: Register multiple passkeys per account
- **Dual Authentication**: Login with either password or passkey
- **Comprehensive Debugging**: Real-time logging of all WebAuthn operations
- **Browser Compatibility**: Check WebAuthn support and capabilities
- **Local Database**: SQLite database for user and passkey storage
- **Modern UI**: Clean, responsive interface built with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- A modern browser with WebAuthn support

### Installation

#### Option 1: Docker Deployment (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd webauthn-test
```

2. Start the application with Docker Compose:
```bash
docker-compose up -d
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

For detailed Docker deployment instructions, see [DOCKER.md](DOCKER.md).

#### Option 2: Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd webauthn-test
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3200](http://localhost:3200) in your browser

## Usage

### 1. Create an Account
- Click "Don't have an account? Register"
- Enter a username and password
- Click "Create Account"

### 2. Add Passkeys
- After logging in, click "Add Passkey"
- Follow your browser's prompts to create a passkey
- The passkey will be registered to your account

### 3. Test Authentication
- Logout and return to the login page
- Choose "Passkey" tab
- Enter your username (optional) and click "Login with Passkey"
- Select your registered passkey when prompted

### 4. Debug Information
- The debug panel (bottom-right) shows all WebAuthn operations
- Expand the panel to see detailed request/response data
- Use this to troubleshoot authentication issues

## Technical Details

### Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite with better-sqlite3
- **WebAuthn**: @simplewebauthn/server and @simplewebauthn/browser
- **Authentication**: bcryptjs for password hashing

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Passkeys table
CREATE TABLE passkeys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  device_type TEXT,
  backed_up BOOLEAN DEFAULT FALSE,
  transports TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE webauthn_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  challenge TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/session` - Check current session

#### Passkeys
- `POST /api/passkeys/register/options` - Get passkey registration options
- `POST /api/passkeys/register/verify` - Verify passkey registration
- `POST /api/passkeys/authenticate/options` - Get authentication options
- `POST /api/passkeys/authenticate/verify` - Verify passkey authentication
- `GET /api/passkeys/list` - List user's passkeys
- `DELETE /api/passkeys/delete` - Delete a passkey

### WebAuthn Configuration

The application is configured via environment variables:

**Default (localhost development):**
- **RP ID**: `localhost`
- **RP Name**: `WebAuthn Test Demo`
- **Origin**: `http://localhost:3200`

**Production deployment:**

Set these environment variables in `docker-compose.yml`:
```yaml
environment:
  - WEBAUTHN_RP_ID=yourdomain.com
  - WEBAUTHN_RP_NAME=Your App Name
  - WEBAUTHN_ORIGIN=https://yourdomain.com
```

Or in local `.env` file:
```bash
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_RP_NAME=Your App Name
WEBAUTHN_ORIGIN=https://yourdomain.com
```

**Important:** Passkeys are tied to the `RP_ID`. Changing it will invalidate existing passkeys.

## Debugging

The debug panel provides comprehensive logging for:

- **Registration Flow**: Options generation, credential creation, verification
- **Authentication Flow**: Options generation, credential assertion, verification
- **Error Handling**: Detailed error messages and stack traces
- **Data Inspection**: Full request/response payloads

### Common Issues

1. **"WebAuthn Not Supported"**
   - Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
   - Check that you're accessing via HTTPS in production

2. **"Passkey Registration Failed"**
   - Check the debug panel for specific error messages
   - Ensure your authenticator (Touch ID, Face ID, etc.) is working
   - Try refreshing the page and attempting again

3. **"Passkey Authentication Failed"**
   - Verify the passkey is still registered
   - Check that you're using the correct username
   - Look at debug logs for verification errors

## Deployment

### Docker Production Deployment

The application is fully containerized and ready for production deployment:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Key features:**
- Multi-stage build for optimized image size
- SQLite database persistence via volume mount
- Health checks for monitoring
- Production-ready configuration

See [DOCKER.md](DOCKER.md) for complete deployment guide including:
- HTTPS/TLS configuration
- Reverse proxy setup (Nginx, Traefik)
- Environment configuration
- Backup strategies
- Production considerations

### Production Checklist

Before deploying to production:

1. **Update WebAuthn configuration** in `docker-compose.yml`:
   ```yaml
   environment:
     - WEBAUTHN_RP_ID=yourdomain.com
     - WEBAUTHN_RP_NAME=Your App Name
     - WEBAUTHN_ORIGIN=https://yourdomain.com
   ```

2. **Configure HTTPS**: WebAuthn requires HTTPS in production
   - Use a reverse proxy (Nginx, Traefik, Caddy)
   - Obtain SSL certificates (Let's Encrypt recommended)

3. **Environment variables**: Update `docker-compose.yml` or create `.env` file based on `.env.example`

4. **Database backup**: Set up regular backups of the `./data` directory

**Note:** All WebAuthn configuration is now controlled via environment variables - no code changes needed!

## Development

### Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── passkeys/      # Passkey management endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── DebugPanel.tsx     # Debug logging component
│   ├── LoginForm.tsx      # Login form
│   ├── PasskeyManager.tsx # Passkey management
│   ├── RegisterForm.tsx   # Registration form
│   └── WebAuthnSupport.tsx # Browser support check
└── lib/                   # Utility libraries
    ├── database.ts        # Database configuration
    └── webauthn.ts        # WebAuthn utilities
```

### Adding Features

1. **New API Endpoints**: Add routes in `/src/app/api/`
2. **UI Components**: Create components in `/src/components/`
3. **Database Changes**: Update schema in `/src/lib/database.ts`
4. **WebAuthn Logic**: Modify utilities in `/src/lib/webauthn.ts`

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the debug panel for error details
2. Review the browser console for additional errors
3. Ensure WebAuthn is supported in your browser
4. Try the authentication flow step by step