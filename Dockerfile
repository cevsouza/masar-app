# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package configurations
COPY masar-web/package*.json ./masar-web/
RUN cd masar-web && npm install

# Copy source code and Prisma schema
COPY masar-web/ ./masar-web/

# Generate Prisma Client and build the Next.js app
RUN cd masar-web && npx prisma generate
RUN cd masar-web && npm run build

# Stage 2: Runner image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy dependencies and build assets
COPY --from=builder /app/masar-web/node_modules ./masar-web/node_modules
COPY --from=builder /app/masar-web/package.json ./masar-web/package.json
COPY --from=builder /app/masar-web/.next ./masar-web/.next
COPY --from=builder /app/masar-web/public ./masar-web/public
COPY --from=builder /app/masar-web/prisma ./masar-web/prisma

EXPOSE 3000

# Start script: push schema to database and start the web server (failsafe)
CMD ["sh", "-c", "cd masar-web && (npx prisma db push --accept-data-loss || true) && npm run start"]
