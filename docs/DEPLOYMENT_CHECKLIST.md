# SealGuard Backend Deployment Checklist

Use this checklist to ensure a successful backend deployment to any platform.

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compilation successful (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code review completed
- [ ] Security audit completed (`npm audit`)

### Environment Configuration
- [ ] `.env` file configured for target environment
- [ ] All required environment variables set
- [ ] Database connection string verified
- [ ] IPFS credentials configured (Pinata/Web3.Storage)
- [ ] JWT secrets generated and secured
- [ ] CORS origins configured correctly

### Database Preparation
- [ ] Database migrations up to date
- [ ] Database backup created (production only)
- [ ] Database connection tested
- [ ] Required indexes created
- [ ] Database user permissions verified

### Dependencies
- [ ] All dependencies installed (`npm ci`)
- [ ] No critical vulnerabilities in dependencies
- [ ] Production dependencies only in package.json
- [ ] Node.js version compatibility verified

## Platform-Specific Checklists

### Railway Deployment
- [ ] Railway CLI installed and authenticated
- [ ] Railway project created/linked
- [ ] PostgreSQL service added
- [ ] Redis service added (if needed)
- [ ] Environment variables configured in Railway dashboard
- [ ] `railway.json` configuration verified
- [ ] Domain configured (if custom domain needed)

### Render Deployment
- [ ] GitHub/GitLab repository connected
- [ ] Render web service created
- [ ] Build and start commands configured
- [ ] Environment variables set in Render dashboard
- [ ] PostgreSQL database service created
- [ ] `render.yaml` configuration verified
- [ ] Health check endpoint configured

### Docker Deployment
- [ ] Dockerfile tested locally
- [ ] Docker Compose configuration verified
- [ ] Environment variables file created
- [ ] Volume mounts configured correctly
- [ ] Network configuration verified
- [ ] Health checks implemented

## Deployment Process

### Pre-Deployment
- [ ] Notify team of deployment
- [ ] Create deployment branch/tag
- [ ] Run final tests
- [ ] Backup current production (if applicable)

### During Deployment
- [ ] Monitor deployment logs
- [ ] Verify build completion
- [ ] Check health endpoint response
- [ ] Verify database connectivity
- [ ] Test IPFS upload functionality

### Post-Deployment
- [ ] Health check passes (`/health` endpoint)
- [ ] Database migrations applied successfully
- [ ] API endpoints responding correctly
- [ ] IPFS uploads working
- [ ] Authentication flow working
- [ ] Frontend can connect to backend
- [ ] Logs show no critical errors
- [ ] Performance metrics within acceptable range

## Verification Tests

### Health Check
```bash
curl -f https://your-backend-url.com/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}
```

### Database Connectivity
```bash
# Test database connection through API
curl -X GET https://your-backend-url.com/api/users/profile \
  -H "Authorization: Bearer <valid-token>"
```

### IPFS Upload Test
```bash
# Test file upload
curl -X POST https://your-backend-url.com/api/documents/upload \
  -H "Authorization: Bearer <valid-token>" \
  -F "file=@test-document.pdf"
```

### Authentication Test
```bash
# Test wallet authentication
curl -X POST https://your-backend-url.com/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","signature":"...","message":"..."}'
```

## Rollback Plan

### Railway Rollback
- [ ] Identify previous deployment ID
- [ ] Use Railway dashboard to rollback
- [ ] Verify rollback success
- [ ] Restore database if needed

### Render Rollback
- [ ] Use Render dashboard to redeploy previous commit
- [ ] Monitor rollback process
- [ ] Verify application functionality
- [ ] Check database consistency

### Docker Rollback
- [ ] Stop current containers
- [ ] Deploy previous image version
- [ ] Restore database backup if needed
- [ ] Verify service restoration

## Monitoring Setup

### Immediate Monitoring (First 24 hours)
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Monitor database performance
- [ ] Watch memory/CPU usage
- [ ] Monitor IPFS upload success rate

### Ongoing Monitoring
- [ ] Set up log aggregation
- [ ] Configure alerting for critical errors
- [ ] Monitor database growth
- [ ] Track API usage patterns
- [ ] Monitor security events

## Common Issues and Solutions

### Database Connection Issues
- **Problem**: Cannot connect to database
- **Solution**: Verify DATABASE_URL format and credentials
- **Check**: `psql $DATABASE_URL -c "SELECT 1;"`

### IPFS Upload Failures
- **Problem**: File uploads failing
- **Solution**: Verify Pinata API credentials
- **Check**: Test API authentication endpoint

### Memory Issues
- **Problem**: Application running out of memory
- **Solution**: Increase memory allocation or optimize code
- **Check**: Monitor memory usage patterns

### High Response Times
- **Problem**: API responses are slow
- **Solution**: Check database query performance
- **Check**: Enable query logging and analyze slow queries

## Security Checklist

### Pre-Deployment Security
- [ ] All secrets stored securely (not in code)
- [ ] HTTPS enabled for production
- [ ] CORS configured for specific origins
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection protection verified
- [ ] XSS protection enabled

### Post-Deployment Security
- [ ] Security headers verified
- [ ] SSL certificate valid
- [ ] No sensitive data in logs
- [ ] API endpoints properly authenticated
- [ ] File upload restrictions working

## Performance Checklist

### Database Performance
- [ ] Connection pooling enabled
- [ ] Indexes created for frequent queries
- [ ] Query performance acceptable
- [ ] Database size monitored

### Application Performance
- [ ] Response times under 500ms for most endpoints
- [ ] Memory usage stable
- [ ] CPU usage reasonable
- [ ] No memory leaks detected

### IPFS Performance
- [ ] File uploads complete within reasonable time
- [ ] IPFS gateway responsive
- [ ] File retrieval working correctly

## Documentation Updates

### Post-Deployment Documentation
- [ ] Update API documentation with new endpoints
- [ ] Document any configuration changes
- [ ] Update environment variable documentation
- [ ] Record deployment notes and lessons learned

### Team Communication
- [ ] Notify team of successful deployment
- [ ] Share any issues encountered and solutions
- [ ] Update deployment runbook if needed
- [ ] Schedule post-deployment review meeting

## Emergency Contacts

### Platform Support
- **Railway**: [Railway Support](https://railway.app/help)
- **Render**: [Render Support](https://render.com/support)
- **Pinata**: [Pinata Support](https://pinata.cloud/support)

### Internal Contacts
- **DevOps Lead**: [Contact Information]
- **Backend Lead**: [Contact Information]
- **Database Admin**: [Contact Information]

---

**Deployment Date**: ___________
**Deployed By**: ___________
**Platform**: ___________
**Environment**: ___________
**Version/Commit**: ___________

**Notes**:
_________________________________
_________________________________
_________________________________

**Sign-off**:
- [ ] Technical Lead: ___________
- [ ] DevOps: ___________
- [ ] QA: ___________