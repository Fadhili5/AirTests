FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

FROM node:20-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm --workspace @lending/shared run build && npm --workspace @lending/api run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json ./

EXPOSE 4000

CMD ["npm", "--workspace", "@lending/api", "run", "start"]
