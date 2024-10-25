FROM oven/bun:latest

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package.json bun.lockb ./

RUN bun install

COPY . .

RUN bun run build

EXPOSE 3000

CMD ["bun", "src/server/server.ts"]
