FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM caddy:2.10-alpine AS caddy

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3100
ENV CADDY_ADMIN_URL=http://127.0.0.1:2019

COPY --from=caddy /usr/bin/caddy /usr/local/bin/caddy
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/restore-caddy.mjs ./restore-caddy.mjs
RUN chmod +x ./start.sh

EXPOSE 3100 80 443
CMD ["./start.sh"]
