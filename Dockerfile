# Builds a single self-contained image that serves both the API and the
# built web app (apps/web/build, adapter-static) — one Cloud Run service,
# one Dockerfile, no separate web/Caddy image. The API serves the web
# build's static files itself (see the isProduction block near the bottom
# of apps/api/src/index.ts) once same-origin, that also removes the
# SameSite cookie gotcha two separate *.run.app services used to have.
#
# Uses `pnpm deploy` to prune the API's own node_modules down to what
# @little-food-truck/api (and its workspace dependency, @little-food-truck/shared)
# actually needs — not the whole monorepo's mobile toolchain.
#
# Like the rest of this monorepo, there's no separate TypeScript build step
# for the API — it runs straight off its .ts source via tsx (see the
# package.json "main"/"exports" pointing at src/index.ts, and the "start"
# script below) — consistent with how apps/api and packages/shared are
# already set up for local dev, and one less build pipeline to keep in sync.
# The web app is the one real build step here (Vite/adapter-static).
#
# Lives at the repo root (not apps/api/) specifically so Cloud Run's
# "Continuously deploy from a repository" wizard finds it with zero manual
# build-config fields: its default is context = repo root, filename =
# `Dockerfile`, exactly what's here. A nested Dockerfile (apps/api/Dockerfile,
# where this used to live) needs the console's Dockerfile-path field pointed
# at it explicitly — and in practice that also scoped the build *context* to
# that subdirectory, breaking `COPY . .` (missing pnpm-lock.yaml,
# packages/shared, apps/web — "ERR_PNPM_NO_LOCKFILE" downstream). Root avoids
# the whole question.
#
# Build from the repo root:
#   docker build -t little-food-truck .
#
# VITE_API_URL is baked into the web build at build time (Vite inlines
# import.meta.env.* — there's no "runtime env var" for a static bundle) and
# defaults to "" here, meaning "same origin as whatever serves this page" —
# correct for this single-service setup without passing anything. Only
# override it with --build-arg VITE_API_URL=https://... if the web build
# is ever deployed somewhere other than this same API.

# @supabase/supabase-js eagerly initializes a Realtime client (even though
# this app never uses it — only .auth and .storage) and that client needs
# a native WebSocket implementation, which only landed in Node 22 (Node 20
# crashes on startup with "native WebSocket not found" — found by actually
# running this image, not by inspection). Pinned to 24 to match the
# `engines` field in the root package.json and the version this was
# developed/tested against locally — don't drop below 22 without re-testing.
FROM node:24-slim AS base
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @little-food-truck/web build

RUN pnpm --filter @little-food-truck/api deploy --legacy --prod /out

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out .
COPY --from=build --chown=node:node /repo/apps/web/build ./public
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Runs the same command as the "start" script directly, rather than via
# `pnpm start` — invoking pnpm/corepack at container runtime (as the
# non-root `node` user, with no write access to re-resolve or download
# anything) is unnecessary and was the actual cause of the first version of
# this Dockerfile failing to boot.
CMD ["node", "--import", "tsx", "src/index.ts"]
