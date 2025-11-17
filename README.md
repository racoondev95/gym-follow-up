# Gym Follow Up Application

A full-stack application with Angular frontend, Node.js backend, and MySQL database, all containerized with Docker.

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide for developers
- **[SECURITY.md](./SECURITY.md)** - Security guidelines and best practices for protecting sensitive data

## Project Structure

```
gym-follow-up/
├── api/              # Node.js backend API
├── client/           # Angular frontend application
├── docker-compose.yml # Docker Compose configuration
├── .env              # Environment variables (NOT in Git - see SECURITY.md)
├── SETUP.md          # Setup guide for developers
├── SECURITY.md       # Security guidelines
└── README.md         # This file
```

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)

## Quick Start

### Using Docker (Recommended)

1. **Create `.env` file** in the root directory (see [SETUP.md](./SETUP.md) for details):
```bash
DB_ROOT_PASSWORD=your_secure_root_password
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=gym_followup
DB_PORT=3306
API_PORT=3000
CLIENT_PORT=4200
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

2. **Start all services**:
```bash
docker-compose up --build
```

3. **Access the application**:
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000
   - MySQL: localhost:3306

**For detailed setup instructions, see [SETUP.md](./SETUP.md)**

### Local Development

#### Backend API

```bash
cd api
npm install
npm run dev
```

#### Frontend Client

```bash
cd client
npm install
npm start
```

## Services

- **Database (MySQL)**: Port 3306
- **Backend API (Node.js/Express)**: Port 3000
- **Frontend (Angular)**: Port 4200

## Environment Variables

**⚠️ IMPORTANT: `.env` files are excluded from Git for security. See [SECURITY.md](./SECURITY.md) for details.**

### Root `.env` file (Required for Docker):
- `DB_ROOT_PASSWORD` - MySQL root password
- `DB_USER` - MySQL user (default: `root`)
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name (default: `gym_followup`)
- `DB_PORT` - MySQL port (default: `3306`)
- `API_PORT` - Backend API port (default: `3000`)
- `CLIENT_PORT` - Frontend port (default: `4200`)
- `NODE_ENV` - Environment (default: `production`)
- `JWT_SECRET` - Secret key for JWT tokens (**IMPORTANT: Use a strong, random secret!**)

For complete environment variable documentation and security best practices, see [SECURITY.md](./SECURITY.md).

## API Endpoints

### Authentication (No JWT required)
- `POST /api/auth/register` - Register a new user (returns user + token)
- `POST /api/auth/login` - Login with email/username and password (returns user + token)
- `GET /api/auth/me` - Get current authenticated user (requires JWT)

### Users (JWT required)
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (User can see own, Admin can see all)
- `POST /api/users` - Create user (Admin only, or use `/api/auth/register`)
- `PUT /api/users/:id` - Update user (User can update own, Admin can update all)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/:id/with-sessions` - Get user with all sessions and exercises

### Sessions (JWT required)
- `GET /api/sessions` - Get all sessions (User sees own, Admin sees all)
- `GET /api/sessions/:id` - Get session by ID
- `GET /api/users/:userId/sessions` - Get sessions by user ID
- `GET /api/sessions/:id/with-exercises` - Get session with all exercises
- `POST /api/sessions` - Create session (User creates for self, Admin can create for anyone)
- `PUT /api/sessions/:id` - Update session (User can update own, Admin can update all)
- `DELETE /api/sessions/:id` - Delete session (User can delete own, Admin can delete all)

### Exercises (JWT required)
- `GET /api/exercises` - Get all exercises (User sees from own sessions, Admin sees all)
- `GET /api/exercises/:id` - Get exercise by ID
- `GET /api/sessions/:sessionId/exercises` - Get exercises by session ID
- `POST /api/exercises` - Create exercise (User creates for own sessions, Admin for any)
- `PUT /api/exercises/:id` - Update exercise (User can update from own sessions, Admin can update all)
- `DELETE /api/exercises/:id` - Delete exercise (User can delete from own sessions, Admin can delete all)

### Health Check (No JWT required)
- `GET /api/health` - Health check

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

### User Roles
- `user` - Regular user (default)
- `admin` - Administrator with full access

### Authorization Rules
- Users can only access/modify their own data
- Admins can access/modify all data
- Register endpoint is public (no authentication required)
- Login endpoint is public (no authentication required)

## Notes

- The database will be automatically initialized with all required tables on first run
- Passwords are hashed using bcrypt
- Profile pictures are stored in `/api/uploads/profiles/`
- All services communicate through Docker network `gym-network`
- Database data is persisted in a Docker volume
- JWT tokens expire after 24 hours

