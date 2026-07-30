FROM node:22-alpine AS base

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/brasa-core/package.json packages/brasa-core/
COPY packages/brasa-admin/package.json packages/brasa-admin/
COPY packages/brasa-api/package.json packages/brasa-api/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/brasa-core/node_modules ./packages/brasa-core/node_modules
COPY --from=deps /app/packages/brasa-admin/node_modules ./packages/brasa-admin/node_modules
COPY --from=deps /app/packages/brasa-api/node_modules ./packages/brasa-api/node_modules
COPY . .

# Increase Node memory for build (prevents OOM on constrained servers)
ENV NODE_OPTIONS="--max-old-space-size=3072"

# Build args → env vars needed at build time by Next.js
ARG DATABASE_URI
ARG AUTH_SECRET
ARG NEXTAUTH_SECRET
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_SITE_URL
ARG BRASA_TENANT_SLUG
ARG METRICS_INGEST_SECRET
ARG REVALIDATE_SECRET
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG SUPABASE_WEBHOOK_SECRET
ARG MASTER_API_KEY
ARG RESEND_API_KEY
ARG SLACK_WEBHOOK_URL

ENV DATABASE_URI=$DATABASE_URI \
    AUTH_SECRET=$AUTH_SECRET \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    BETTER_AUTH_URL=$BETTER_AUTH_URL \
    NEXTAUTH_URL=$NEXTAUTH_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    BRASA_TENANT_SLUG=$BRASA_TENANT_SLUG \
    METRICS_INGEST_SECRET=$METRICS_INGEST_SECRET \
    REVALIDATE_SECRET=$REVALIDATE_SECRET \
    SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
    SUPABASE_WEBHOOK_SECRET=$SUPABASE_WEBHOOK_SECRET \
    MASTER_API_KEY=$MASTER_API_KEY \
    RESEND_API_KEY=$RESEND_API_KEY \
    SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL

RUN corepack enable pnpm && pnpm run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
