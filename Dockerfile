# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/

RUN npm ci \
  && npm --prefix server ci

COPY . .

RUN npm run build \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV DATABASE_PATH=/app/data/sampler-salary.sqlite

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 3002

CMD ["node", "dist/server/index.js"]
