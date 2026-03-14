FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/src ./apps/api/src
COPY apps/api/prisma ./apps/api/prisma

RUN npm --prefix apps/api run build

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
