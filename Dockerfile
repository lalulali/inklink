# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci --ignore-scripts
COPY . .
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

FROM alpine:3.23 AS runner
RUN apk upgrade --no-cache \
  && apk add --no-cache nodejs \
  && addgroup -S nodejs -g 1001 \
  && adduser  -S nextjs  -u 1001 -G nodejs
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
