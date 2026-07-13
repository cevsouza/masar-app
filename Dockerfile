# Stage 1: Build the application
FROM node:20-slim AS builder
WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package configurations
COPY masar-web/package*.json ./masar-web/
RUN cd masar-web && npm install

# Copy source code and Prisma schema
COPY masar-web/ ./masar-web/

# Generate Prisma Client and build the Next.js app
RUN cd masar-web && npx prisma generate
RUN cd masar-web && npm run build

# Stage 2: Runner image
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install openssl for Prisma runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy dependencies and build assets
COPY --from=builder /app/masar-web/node_modules ./masar-web/node_modules
COPY --from=builder /app/masar-web/package.json ./masar-web/package.json
COPY --from=builder /app/masar-web/.next ./masar-web/.next
COPY --from=builder /app/masar-web/public ./masar-web/public
COPY --from=builder /app/masar-web/prisma ./masar-web/prisma

EXPOSE 3000

# Start script: fallback to DATABASE_URL if DIRECT_URL is not set, then apply
# pending migrations (revisable, non-destructive) and start.
# NOTE: schema changes now go through committed migrations (`prisma migrate dev`
# locally -> migration file -> `migrate deploy` here). Do NOT go back to
# `db push --accept-data-loss` — it drops data silently on every boot.
CMD ["sh", "-c", "cd masar-web && export DIRECT_URL=\"${DIRECT_URL:-$DATABASE_URL}\" && npx prisma migrate deploy && npm run start"]
