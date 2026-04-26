FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for PostgreSQL
RUN npx prisma generate

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Environment variables (overridden at runtime by docker-compose / orchestration)
ENV DATABASE_URL="postgresql://arwa:arwa_secret_2026@postgres:5432/arwa_logistics?schema=public"
ENV REDIS_URL="redis://redis:6379"
ENV RABBITMQ_URL="amqp://arwa:arwa_rabbitmq_2026@rabbitmq:5672"
ENV JWT_SECRET="arwa-jwt-secret-key-2026-production-change-me"

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
