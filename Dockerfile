# Multi-stage build for the kun-domain-monitor Nuxt 4 app (Nitro node-server preset).
#
# Targets:
#   run     (default) — slim runtime: just Node + the self-contained .output
#   migrate           — the build env + `prisma db push`, for one-off schema sync
#
# No secrets are baked in. At runtime, inject config via canonical NUXT_-prefixed
# env vars (Nitro maps NUXT_FOO -> runtimeConfig.FOO); see docker-compose.prod.yml.
ARG NODE_VERSION=22

# ---- base: Node + pnpm (via corepack, pinned by package.json packageManager) ----
FROM node:${NODE_VERSION}-trixie-slim AS base
RUN corepack enable
WORKDIR /app

# ---- deps: install the full dependency graph (cached on lockfile changes) ----
# --ignore-scripts: the root postinstall is `nuxt prepare`, which needs the app
# source (not copied yet); `nuxt build` runs prepare itself in the build stage.
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build: generate Prisma client, then build Nuxt into a self-contained .output ----
FROM deps AS build
COPY . .
# `prisma generate` doesn't connect, but prisma.config.ts resolves
# env('KUN_DATABASE_URL'); give a throwaway value inline so it isn't persisted
# into the image / baked into runtimeConfig.
RUN KUN_DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    pnpm prisma:generate
RUN pnpm build

# ---- migrate: one-off `prisma db push` (run via compose `--profile jobs`) ----
# Reuses the build env (source + prisma CLI + schema + generated client) which is
# the exact, known-working environment that runs `pnpm prisma:push` in dev.
FROM build AS migrate
CMD ["pnpm", "exec", "prisma", "db", "push"]

# ---- run: minimal runtime image, only the built server output ----
FROM node:${NODE_VERSION}-trixie-slim AS run
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    NITRO_PORT=3000
WORKDIR /app
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
