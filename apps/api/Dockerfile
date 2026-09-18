# Builds a self-contained image for just the API out of the pnpm
# workspace, using `pnpm deploy` to prune node_modules down to what
# @little-food-truck/api (and its workspace dependency, @little-food-truck/shared)
# actually needs — not the whole monorepo's web/mobile toolchains.
#
# Like the rest of this monorepo, there's no separate TypeScript build step:
# both packages run straight off their .ts source via tsx (see each
# package.json's "main"/"exports" pointing at src/index.ts, and the "start"
# script below) — consistent with how apps/api and packages/shared are
# already set up for local dev, and one less build pipeline to keep in sync.
#
# Build from the repo root, not this directory:
#   docker build -f apps/api/Dockerfile -t little-food-truck-api .

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
RUN pnpm --filter @little-food-truck/api deploy --legacy --prod /out

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out .
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
