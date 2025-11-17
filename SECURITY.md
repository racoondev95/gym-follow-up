# Security Guidelines - Gym Follow Up

This document outlines security best practices for protecting sensitive data in the Gym Follow Up application.

## Environment Variables Protection

### Why `.env` Files Are Excluded

The `.env` files contain sensitive information including:
- Database passwords
- JWT secret keys
- API keys
- Other configuration secrets

**These files should NEVER be committed to version control (Git).**

### `.gitignore` Configuration

The project's `.gitignore` file is configured to exclude:

```
# Environment variables - DO NOT COMMIT
.env
.env.local
.env.*.local
api/.env
client/.env
```

This ensures that:
- Your sensitive data remains private
- You can safely push code to public repositories
- Each developer/environment can have their own configuration
- Production secrets are not exposed

## Best Practices

### 1. Create `.env` Files Locally

Each developer should create their own `.env` file based on the example:

```bash
# Copy example (if available)
cp .env.example .env

# Or create manually
touch .env
```

### 2. Use Strong Secrets

**Never use default or weak passwords!**

```bash
# ❌ BAD - Weak password
DB_PASSWORD=password123
JWT_SECRET=secret

# ✅ GOOD - Strong, random password
DB_PASSWORD=Kx9#mP2$vL8@nQ5!
JWT_SECRET=a7f3b9c2d4e6f8a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9
```

### 3. Different Secrets for Different Environments

Use different secrets for:
- **Development** - Local development environment
- **Staging** - Pre-production testing
- **Production** - Live production environment

### 4. Never Share `.env` Files

- Don't email `.env` files
- Don't share them in chat applications
- Don't commit them to Git
- Use secure methods (encrypted channels) if sharing is absolutely necessary

### 5. Rotate Secrets Regularly

Change passwords and secrets:
- When team members leave
- If a security breach is suspected
- Periodically (e.g., every 90 days)

## What to Commit

### ✅ Safe to Commit

- Source code (`.ts`, `.js`, `.html`, `.css` files)
- Configuration files (without secrets)
- Documentation (`.md` files)
- `package.json` and `package-lock.json`
- `docker-compose.yml` (without hardcoded secrets)
- `.gitignore`

### ❌ Never Commit

- `.env` files
- `.env.local` files
- Any file containing passwords, API keys, or secrets
- `node_modules/` directory
- Build artifacts (`dist/`, `build/`)
- IDE configuration files (`.vscode/`, `.idea/`)

## Example `.env` File Structure

Create a `.env` file in the root directory:

```bash
# Database Configuration
DB_ROOT_PASSWORD=your_secure_root_password_here
DB_USER=root
DB_PASSWORD=your_secure_password_here
DB_NAME=gym_followup
DB_PORT=3306

# API Configuration
API_PORT=3000
NODE_ENV=production

# Frontend Configuration
CLIENT_PORT=4200

# JWT Secret - MUST be a strong, random string
# Generate one using: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Generating Strong Secrets

### Using OpenSSL

```bash
# Generate a random 32-byte secret (base64 encoded)
openssl rand -base64 32

# Generate a random 64-byte secret
openssl rand -base64 64
```

### Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Using Online Tools

Use reputable password generators:
- [1Password Generator](https://1password.com/password-generator/)
- [LastPass Generator](https://www.lastpass.com/features/password-generator)

## Verifying `.gitignore` is Working

Before committing, verify that `.env` files are excluded:

```bash
# Check what Git sees
git status

# If .env appears, it's not ignored
# Verify .gitignore includes .env
cat .gitignore | grep "\.env"
```

## If You Accidentally Committed `.env`

If you accidentally committed a `.env` file:

1. **Immediately change all secrets** in the committed file
2. **Remove from Git history**:
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from repository"
   ```
3. **If already pushed**, consider:
   - Changing all secrets immediately
   - Using `git filter-branch` or BFG Repo-Cleaner to remove from history
   - If public, assume secrets are compromised and rotate all

## Additional Security Measures

### 1. Database Security

- Use strong passwords
- Limit database access to necessary IPs only
- Regularly update MySQL
- Use SSL/TLS for database connections in production

### 2. API Security

- Always use HTTPS in production
- Implement rate limiting
- Validate and sanitize all inputs
- Use parameterized queries (already implemented)
- Keep dependencies updated

### 3. JWT Security

- Use strong, random secrets
- Set appropriate expiration times
- Store tokens securely (httpOnly cookies in production)
- Implement token refresh mechanism

### 4. File Upload Security

- Validate file types
- Limit file sizes
- Scan uploaded files for malware
- Store uploads outside web root when possible

## Production Checklist

Before deploying to production:

- [ ] All `.env` files are excluded from Git
- [ ] Strong, unique passwords are set
- [ ] JWT secret is strong and random
- [ ] Database is not publicly accessible
- [ ] HTTPS is enabled
- [ ] All default passwords are changed
- [ ] Dependencies are updated
- [ ] Security headers are configured
- [ ] Error messages don't expose sensitive information
- [ ] Logs don't contain sensitive data

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public issue
2. Contact the project maintainers privately
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Angular Security Guide](https://angular.io/guide/security)
- [Docker Security](https://docs.docker.com/engine/security/)

