FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

COPY package.json tsconfig.base.json ./
COPY prisma ./prisma
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/bot/package.json ./apps/bot/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
CMD ["node", "scripts/start-service.mjs"]

