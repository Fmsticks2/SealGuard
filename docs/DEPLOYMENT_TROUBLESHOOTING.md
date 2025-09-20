# SealGuard Backend Deployment Troubleshooting Guide

This guide helps you diagnose and resolve common issues encountered during backend deployment.

## Quick Diagnosis Commands

```bash
# Check application health
curl -f https://your-backend-url.com/health

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Verify environment variables
node -e "console.log(process.env.NODE_ENV, process.env.DATABASE_URL ? 'DB_SET' : 'DB_MISSING')"

# Check logs
tail -f logs/app.log
# Or for Docker:
docker logs sealguard-backend
```

## Common Deployment Issues

### 1. Application Won't Start

#### Symptoms
- Server fails to start
- Process exits immediately
- "Cannot find module" errors

#### Diagnosis
```bash
# Check Node.js version
node --version
# Should be 18.x or higher

# Check npm version
npm --version

# Verify package.json
cat package.json | grep -E '"name"|"version"|"main"'

# Check for missing dependencies
npm ls --depth=0
```

#### Solutions

**Missing Dependencies**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm ci
```

**Wrong Node.js Version**
```bash
# Install correct Node.js version
nvm install 18
nvm use 18
```

**TypeScript Compilation Issues**
```bash
# Check TypeScript compilation
npm run type-check

# Build the application
npm run build

# Check build output
ls -la dist/
```

### 2. Database Connection Issues

#### Symptoms
- "Connection refused" errors
- "Authentication failed" errors
- "Database does not exist" errors

#### Diagnosis
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check database URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/database

# Test with different connection parameters
psql -h hostname -p 5432 -U username -d database_name
```

#### Solutions

**Connection Refused**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql
# Or for Docker:
docker ps | grep postgres

# Start PostgreSQL service
sudo systemctl start postgresql
# Or for Docker:
docker-compose up -d postgres
```

**Authentication Failed**
```bash
# Verify credentials in DATABASE_URL
# Format: postgresql://username:password@host:port/database

# Reset database password (if needed)
sudo -u postgres psql -c "ALTER USER username PASSWORD 'newpassword';"
```

**Database Does Not Exist**
```bash
# Create database
createdb sealguard_dev
# Or:
sudo -u postgres createdb sealguard_dev

# Run migrations
npm run db:migrate
```

**SSL Connection Issues**
```bash
# For cloud databases, add SSL parameters
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

### 3. Environment Variable Issues

#### Symptoms
- "Required environment variable not set" errors
- Configuration not loading correctly
- Features not working as expected

#### Diagnosis
```bash
# Check if .env file exists
ls -la .env*

# Verify environment variables are loaded
node -e "require('dotenv').config(); console.log(Object.keys(process.env).filter(k => k.includes('DATABASE')));"

# Check specific variables
echo $DATABASE_URL
echo $JWT_SECRET
echo $PINATA_API_KEY
```

#### Solutions

**Missing .env File**
```bash
# Copy from template
cp .env.example .env
# Edit with your values
nano .env
```

**Variables Not Loading**
```bash
# Check .env file format (no spaces around =)
# Correct: DATABASE_URL=postgresql://...
# Incorrect: DATABASE_URL = postgresql://...

# Check for special characters
# Wrap values with special characters in quotes
JWT_SECRET="my-secret-with-special-chars!@#"
```

**Platform-Specific Issues**
```bash
# Railway: Set variables in dashboard or CLI
railway variables set JWT_SECRET=your-secret

# Render: Set in dashboard environment variables section
# Docker: Use docker.env file or docker-compose environment section
```

### 4. IPFS Upload Issues

#### Symptoms
- File uploads fail
- "Pinata authentication failed" errors
- Uploads timeout

#### Diagnosis
```bash
# Test Pinata authentication
curl -X GET \
  https://api.pinata.cloud/data/testAuthentication \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET_API_KEY"

# Check IPFS gateway
curl -I https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
```

#### Solutions

**Invalid API Keys**
```bash
# Verify API keys in Pinata dashboard
# Regenerate keys if necessary
# Update environment variables
```

**Network Issues**
```bash
# Check firewall settings
# Ensure outbound HTTPS (443) is allowed

# Test with different IPFS gateway
IPFS_GATEWAY_URL=https://ipfs.io/ipfs
```

**File Size Issues**
```bash
# Check file size limits
echo $MAX_FILE_SIZE
# Default: 104857600 (100MB)

# Increase limit if needed
MAX_FILE_SIZE=209715200  # 200MB
```

### 5. JWT Authentication Issues

#### Symptoms
- "Invalid token" errors
- Authentication fails
- Token expires immediately

#### Diagnosis
```bash
# Check JWT secret
echo $JWT_SECRET | wc -c
# Should be at least 32 characters

# Test token generation
node -e "console.log(require('jsonwebtoken').sign({test: true}, process.env.JWT_SECRET))"

# Decode existing token (without verification)
node -e "console.log(require('jsonwebtoken').decode('YOUR_TOKEN_HERE'))"
```

#### Solutions

**Weak JWT Secret**
```bash
# Generate strong secret
JWT_SECRET=$(openssl rand -base64 32)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 32)
```

**Clock Synchronization**
```bash
# Ensure server time is synchronized
sudo ntpdate -s time.nist.gov
# Or:
sudo systemctl restart ntp
```

**Token Expiration**
```bash
# Adjust token expiration
JWT_EXPIRES_IN=24h  # Instead of 7d for testing
```

### 6. Port and Network Issues

#### Symptoms
- "Port already in use" errors
- "EADDRINUSE" errors
- Cannot access application

#### Diagnosis
```bash
# Check what's using the port
netstat -tulpn | grep :3001
# Or:
lsof -i :3001

# Check if application is running
ps aux | grep node
```

#### Solutions

**Port Already in Use**
```bash
# Kill process using port
kill -9 $(lsof -t -i:3001)

# Or use different port
PORT=3002 npm start
```

**Firewall Issues**
```bash
# Check firewall status
sudo ufw status

# Allow port (if needed)
sudo ufw allow 3001
```

**Docker Port Mapping**
```bash
# Check Docker port mapping
docker ps
# Should show: 0.0.0.0:3001->3001/tcp

# Fix port mapping in docker-compose.yml
ports:
  - "3001:3001"
```

## Platform-Specific Issues

### Railway Issues

#### Build Failures
```bash
# Check Railway logs
railway logs

# Redeploy
railway up --detach

# Check service status
railway status
```

#### Database Connection
```bash
# Use Railway's database URL
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Check database service
railway ps
```

#### Environment Variables
```bash
# List variables
railway variables

# Set variable
railway variables set JWT_SECRET=your-secret

# Delete variable
railway variables delete OLD_VARIABLE
```

### Render Issues

#### Build Failures
- Check build logs in Render dashboard
- Verify build command: `npm install && npm run build`
- Check Node.js version in dashboard settings

#### Database Connection
```bash
# Use Render's internal database URL
# Set in environment variables section
DATABASE_URL=postgresql://...
```

#### Static Files
```bash
# Ensure static files are built
npm run build

# Check dist/ directory exists
ls -la dist/
```

### Docker Issues

#### Container Won't Start
```bash
# Check container logs
docker logs sealguard-backend

# Check container status
docker ps -a

# Restart container
docker restart sealguard-backend
```

#### Volume Issues
```bash
# Check volume mounts
docker inspect sealguard-backend | grep -A 10 "Mounts"

# Fix permissions
sudo chown -R 1000:1000 ./uploads
```

#### Network Issues
```bash
# Check Docker networks
docker network ls

# Inspect network
docker network inspect sealguard_default

# Test container connectivity
docker exec sealguard-backend ping postgres
```

## Performance Issues

### High Memory Usage

#### Diagnosis
```bash
# Check memory usage
free -h
# Or for Docker:
docker stats sealguard-backend

# Check Node.js heap usage
node -e "console.log(process.memoryUsage())"
```

#### Solutions
```bash
# Increase memory limit (Docker)
docker run -m 512m sealguard-backend

# Optimize Node.js memory
node --max-old-space-size=512 src/index.js

# Enable garbage collection logging
node --trace-gc src/index.js
```

### Slow Response Times

#### Diagnosis
```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s https://your-backend-url.com/health

# Check database query performance
# Enable query logging in PostgreSQL
```

#### Solutions
```bash
# Add database indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);

# Enable connection pooling
# Check Prisma connection pool settings

# Enable compression
# Verify gzip compression is enabled
```

### High CPU Usage

#### Diagnosis
```bash
# Check CPU usage
top -p $(pgrep -f "node.*src/index.js")

# Profile application
node --prof src/index.js
```

#### Solutions
```bash
# Optimize code
# Review CPU-intensive operations
# Add caching where appropriate

# Scale horizontally
# Deploy multiple instances
```

## Security Issues

### SSL/TLS Issues

#### Symptoms
- "SSL certificate error" messages
- "Connection not secure" warnings
- HTTPS not working

#### Solutions
```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443

# Verify certificate expiration
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# For Railway/Render: SSL is handled automatically
# For custom domains: Configure SSL certificate
```

### CORS Issues

#### Symptoms
- "CORS policy" errors in browser
- Frontend cannot connect to backend
- Preflight request failures

#### Solutions
```bash
# Check CORS configuration
echo $CORS_ORIGIN

# Allow specific origin
CORS_ORIGIN=https://your-frontend-domain.com

# For development (not recommended for production)
CORS_ORIGIN=*
```

## Monitoring and Debugging

### Enable Debug Logging

```bash
# Enable debug mode
DEBUG=* npm start

# Or specific modules
DEBUG=app:* npm start

# Set log level
LOG_LEVEL=debug
```

### Health Check Monitoring

```bash
# Create monitoring script
#!/bin/bash
# monitor.sh
while true; do
  if curl -f https://your-backend-url.com/health > /dev/null 2>&1; then
    echo "$(date): Health check passed"
  else
    echo "$(date): Health check failed"
    # Send alert
  fi
  sleep 60
done
```

### Log Analysis

```bash
# Search for errors
grep -i error logs/app.log

# Count error types
grep -i error logs/app.log | sort | uniq -c

# Monitor real-time logs
tail -f logs/app.log | grep -i error
```

## Emergency Recovery

### Quick Rollback

```bash
# Railway rollback
railway rollback [deployment-id]

# Render rollback
# Use dashboard to redeploy previous commit

# Docker rollback
docker stop sealguard-backend
docker run -d --name sealguard-backend sealguard-backend:previous-tag
```

### Database Recovery

```bash
# Restore from backup
psql $DATABASE_URL < backup_20231201_120000.sql

# Check database integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### Service Recovery

```bash
# Restart all services
docker-compose restart

# Or restart specific service
docker-compose restart backend

# Check service health
docker-compose ps
```

## Getting Help

### Collect Diagnostic Information

```bash
#!/bin/bash
# diagnostic.sh
echo "=== System Information ==="
uname -a
node --version
npm --version

echo "\n=== Environment Variables ==="
env | grep -E '(NODE_ENV|DATABASE_URL|PORT)' | sed 's/=.*/=***HIDDEN***/'

echo "\n=== Application Status ==="
ps aux | grep node

echo "\n=== Network Status ==="
netstat -tulpn | grep :3001

echo "\n=== Recent Logs ==="
tail -20 logs/app.log

echo "\n=== Database Status ==="
psql $DATABASE_URL -c "SELECT version();" 2>&1
```

### Support Channels

- **Platform Support**:
  - Railway: [Railway Discord](https://discord.gg/railway)
  - Render: [Render Support](https://render.com/support)
  - Docker: [Docker Community](https://forums.docker.com)

- **Application Issues**:
  - Check application logs
  - Review environment configuration
  - Test individual components

### Creating Support Tickets

Include the following information:

1. **Environment Details**:
   - Platform (Railway/Render/Docker)
   - Node.js version
   - Application version/commit

2. **Error Information**:
   - Complete error messages
   - Stack traces
   - Relevant log entries

3. **Steps to Reproduce**:
   - What you were trying to do
   - What happened instead
   - Any workarounds attempted

4. **Configuration**:
   - Environment variables (sanitized)
   - Deployment configuration
   - Recent changes

---

*Keep this guide updated as you encounter and resolve new issues. Document solutions for future reference.*