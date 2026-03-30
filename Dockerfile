FROM node:22-slim AS base
RUN corepack enable

# --- build ---
FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/ apps/
RUN pnpm -F @metronome/web build
RUN pnpm -F @metronome/server build

# --- runtime ---
FROM base
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/server/package.json apps/server/
COPY --from=build /app/apps/server/dist/ apps/server/dist/
COPY --from=build /app/apps/web/dist/ apps/web/dist/
COPY --from=build /app/packages/types/package.json packages/types/
COPY --from=build /app/packages/types/src/ packages/types/src/

COPY blueprints/ blueprints/
COPY pipelines/ pipelines/

RUN pnpm install --frozen-lockfile --prod
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "apps/server/dist/index.js"]
