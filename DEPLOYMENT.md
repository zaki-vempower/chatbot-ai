# Deployment Guide - AI Chatbot

This guide covers different deployment options for your AI Chatbot application.

## 🚀 Quick Local Setup

```bash
# Clone and setup
git clone <your-repo>
cd chatbot-ai
./setup.sh

# Add your API keys to .env.local
# Start the application
npm run dev
```

## 🌐 Production Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest option for Next.js applications:

1. **Prepare for deployment**:
   ```bash
   # Ensure your app builds successfully
   npm run build
   ```

2. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel

   # Follow the prompts to configure your project
   ```

3. **Configure environment variables** in Vercel dashboard:
   - `DATABASE_URL` (use Vercel Postgres or external DB)
   - `NEXTAUTH_SECRET`
   - `JWT_SECRET`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_API_KEY`
   - `DEEPSEEK_API_KEY`

4. **Database considerations**:
   - For production, replace SQLite with PostgreSQL
   - Use Vercel Postgres or external provider
   - Update Prisma schema in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

### Option 2: Railway

1. **Connect your repository** to Railway
2. **Configure environment variables**
3. **Add PostgreSQL addon**
4. **Deploy automatically**

### Option 3: DigitalOcean App Platform

1. **Create new app** from GitHub repository
2. **Configure build settings**:
   - Build command: `npm run build`
   - Run command: `npm start`
3. **Add database component** (PostgreSQL)
4. **Configure environment variables**

### Option 4: Docker Deployment

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app

   COPY package.json package-lock.json* ./
   RUN npm ci

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .

   RUN npm run build

   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app

   ENV NODE_ENV production

   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs

   EXPOSE 3000

   ENV PORT 3000

   CMD ["node", "server.js"]
   ```

2. **Build and run**:
   ```bash
   docker build -t ai-chatbot .
   docker run -p 3000:3000 ai-chatbot
   ```

## 🗄️ Database Migration for Production

### From SQLite to PostgreSQL

1. **Update Prisma schema**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Install PostgreSQL adapter**:
   ```bash
   npm install pg @types/pg
   ```

3. **Create new migration**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Generate new client**:
   ```bash
   npx prisma generate
   ```

## 🔐 Security Considerations

### Environment Variables

**Never commit these to your repository**:
- API keys
- Database URLs
- JWT secrets
- NextAuth secrets

### Production Security Checklist

- [ ] Use strong, randomly generated secrets
- [ ] Enable HTTPS/SSL
- [ ] Use environment variables for all secrets
- [ ] Implement rate limiting
- [ ] Add CORS protection
- [ ] Use secure database connections
- [ ] Regular security updates

### Rate Limiting

Add rate limiting to API routes:

```typescript
// lib/rateLimit.ts
import { NextRequest } from 'next/server'

const rateLimitMap = new Map()

export function rateLimit(limit: number = 10, windowMs: number = 60000) {
  return (req: NextRequest) => {
    const ip = req.ip ?? 'anonymous'
    const now = Date.now()
    const windowStart = now - windowMs

    const requestLog = rateLimitMap.get(ip) || []
    const requestsInWindow = requestLog.filter((time: number) => time > windowStart)

    if (requestsInWindow.length >= limit) {
      return false
    }

    requestsInWindow.push(now)
    rateLimitMap.set(ip, requestsInWindow)
    return true
  }
}
```

## 📊 Monitoring and Analytics

### Add Application Monitoring

1. **Vercel Analytics** (if using Vercel):
   ```bash
   npm install @vercel/analytics
   ```

2. **Sentry for Error Tracking**:
   ```bash
   npm install @sentry/nextjs
   ```

3. **PostHog for User Analytics**:
   ```bash
   npm install posthog-js
   ```

### Performance Monitoring

- Monitor API response times
- Track database query performance
- Monitor AI API usage and costs
- Set up alerts for errors

## 🚀 CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🔧 Environment-Specific Configuration

### Development
- Use SQLite for quick setup
- Enable verbose logging
- Use development API keys with lower rate limits

### Staging
- Use PostgreSQL
- Mirror production environment
- Use separate API keys

### Production
- Use PostgreSQL with connection pooling
- Enable error reporting
- Use production API keys
- Enable caching and optimization

## 📱 Mobile Deployment

### Progressive Web App (PWA)

Add PWA capabilities:

1. **Install next-pwa**:
   ```bash
   npm install next-pwa
   ```

2. **Configure in next.config.js**:
   ```javascript
   const withPWA = require('next-pwa')({
     dest: 'public'
   })

   module.exports = withPWA({
     // your next config
   })
   ```

3. **Add manifest.json** and service worker

### React Native App

For a mobile app version:
1. Set up React Native
2. Share API endpoints
3. Reuse business logic
4. Adapt UI components

## 🔄 Backup and Recovery

### Database Backups

1. **Automated backups** (PostgreSQL):
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Backup strategy**:
   - Daily automated backups
   - Weekly full backups
   - Monthly archive backups
   - Test restore procedures

### Data Export

Implement user data export:
- Conversation history
- Crawled data
- User preferences
- API usage statistics

## 📞 Support and Maintenance

### Monitoring Checklist

- [ ] Application uptime
- [ ] API response times
- [ ] Database performance
- [ ] Error rates
- [ ] AI API costs
- [ ] User activity metrics

### Regular Maintenance

- [ ] Update dependencies monthly
- [ ] Security patches immediately
- [ ] Performance optimizations
- [ ] Database maintenance
- [ ] Log rotation
- [ ] Backup verification

## 🎯 Scaling Considerations

### Horizontal Scaling

- Load balancing multiple instances
- Database read replicas
- CDN for static assets
- Caching layers (Redis)

### Vertical Scaling

- Increase server resources
- Optimize database queries
- Implement connection pooling
- Add application caching

### Cost Optimization

- Monitor AI API usage
- Implement request caching
- Use cheaper models for simple tasks
- Optimize database queries
- Implement user limits
