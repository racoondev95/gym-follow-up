# Gym Follow Up - Setup Guide for Developers

This guide will help you set up and run the Gym Follow Up application in Docker.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git** (for cloning the repository)

### Verify Installation

```bash
docker --version
docker-compose --version
git --version
```

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd gym-follow-up
```

### 2. Create Environment Files

The application uses environment variables for configuration. **Important: Never commit `.env` files to Git!**

#### Root `.env` file

Create a `.env` file in the root directory:

```bash
# Database Configuration
DB_ROOT_PASSWORD=your_secure_root_password
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=gym_followup
DB_PORT=3306

# API Configuration
API_PORT=3000
NODE_ENV=production

# Frontend Configuration
CLIENT_PORT=4200

# JWT Secret (IMPORTANT: Use a strong, random secret in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

#### API `.env` file (optional, if running API locally)

If you need to run the API locally (outside Docker), create `api/.env`:

```bash
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=gym_followup
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Note:** When running in Docker, the API uses environment variables from `docker-compose.yml`, not from `api/.env`.

### 3. Build and Start Services

Build and start all services (database, API, and frontend) using Docker Compose:

```bash
docker-compose up --build
```

This command will:
- Build the Docker images for API and frontend
- Start the MySQL database
- Start the Node.js API server
- Start the Angular frontend (served via Nginx)
- Create a Docker network for inter-service communication

### 4. Access the Application

Once all services are running, you can access:

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health
- **MySQL Database**: localhost:3306

### 5. Stop Services

To stop all services:

```bash
docker-compose down
```

To stop and remove volumes (this will delete the database data):

```bash
docker-compose down -v
```

## Project Structure

```
gym-follow-up/
├── api/                    # Node.js backend API
│   ├── server.js           # Main API server
│   ├── Dockerfile          # API Docker configuration
│   ├── package.json        # API dependencies
│   └── uploads/            # Uploaded files (profile pictures)
├── client/                 # Angular frontend
│   ├── src/                # Source code
│   ├── Dockerfile          # Frontend Docker configuration
│   ├── nginx.conf          # Nginx configuration
│   ├── package.json        # Frontend dependencies
│   └── angular.json        # Angular configuration
├── docker-compose.yml      # Docker Compose configuration
├── .env                    # Environment variables (NOT in Git)
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
└── SETUP.md                # This file
```

## Environment Variables

### Security Best Practices

1. **Never commit `.env` files to Git** - They contain sensitive information
2. **Use strong passwords** - Especially for database and JWT secret
3. **Change default values** - Don't use default passwords in production
4. **Use different secrets per environment** - Development, staging, production should have different secrets

### Required Environment Variables

#### Root `.env` (for Docker Compose)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_ROOT_PASSWORD` | MySQL root password | - | Yes |
| `DB_USER` | MySQL user | `root` | No |
| `DB_PASSWORD` | MySQL password | - | Yes |
| `DB_NAME` | Database name | `gym_followup` | No |
| `DB_PORT` | MySQL port | `3306` | No |
| `API_PORT` | API server port | `3000` | No |
| `CLIENT_PORT` | Frontend port | `4200` | No |
| `NODE_ENV` | Environment | `production` | No |
| `JWT_SECRET` | JWT secret key | - | Yes |

## Troubleshooting

### Port Already in Use

If you get an error that a port is already in use:

1. Check what's using the port:
   ```bash
   # For macOS/Linux
   lsof -i :3000
   lsof -i :4200
   lsof -i :3306
   ```

2. Either stop the service using the port, or change the port in `.env` and `docker-compose.yml`

### Database Connection Issues

If the API can't connect to the database:

1. Check if the database container is running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs db
   ```

3. Verify environment variables in `docker-compose.yml` match your `.env` file

### Frontend Not Loading

If the frontend doesn't load:

1. Check if the client container is running:
   ```bash
   docker-compose ps
   ```

2. Check client logs:
   ```bash
   docker-compose logs client
   ```

3. Verify the build completed successfully:
   ```bash
   docker-compose logs client | grep -i "build"
   ```

### API Not Responding

If the API doesn't respond:

1. Check API logs:
   ```bash
   docker-compose logs api
   ```

2. Verify the API can connect to the database:
   ```bash
   docker-compose exec api node -e "console.log(process.env.DB_HOST)"
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

## Development Workflow

### Making Changes

1. **Code changes** - Edit files in `api/` or `client/`
2. **Rebuild** - Run `docker-compose up --build` to rebuild images
3. **Restart** - Use `docker-compose restart <service>` to restart a specific service

### Viewing Logs

View logs for all services:
```bash
docker-compose logs -f
```

View logs for a specific service:
```bash
docker-compose logs -f api
docker-compose logs -f client
docker-compose logs -f db
```

### Database Access

Access the MySQL database directly:

```bash
docker-compose exec db mysql -u root -p
```

Enter the password from your `.env` file when prompted.

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Angular Documentation](https://angular.io/docs)
- [Node.js Documentation](https://nodejs.org/docs)
- [MySQL Documentation](https://dev.mysql.com/doc/)

## Support

If you encounter issues not covered in this guide:

1. Check the logs: `docker-compose logs`
2. Verify your `.env` file is correctly configured
3. Ensure all prerequisites are installed
4. Check the main README.md for additional information

