FROM node:22-alpine AS deps

WORKDIR /app/apps/api
COPY apps/api/package.json ./package.json
RUN npm install

FROM node:22-alpine AS build

WORKDIR /app
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

WORKDIR /app/apps/api
RUN npm run build && npm run db:generate

FROM node:22-alpine AS runtime

WORKDIR /app/apps/api
ENV NODE_ENV=production

COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
