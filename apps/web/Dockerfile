# Builds the web app's static SPA output (apps/web/build/, from
# adapter-static) and serves it with Caddy. Same shape as
# apps/api/Dockerfile — multi-stage, self-contained out of the pnpm
# workspace — but the runtime stage needs none of Node/pnpm at all, since
# the build step already produced plain static files.
#
# Build from the repo root, not this directory:
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_API_URL=https://your-api-service-url \
#     -t little-food-truck-web .
#
# VITE_API_URL is baked in at build time (Vite inlines import.meta.env.* into
# the bundle — there's no "runtime env var" for a static site), so it has to
# be a build arg, not a Cloud Run service env var. See the README's Cloud Run
# deployment section for how to set this when deploying straight from git.

FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @little-food-truck/web build

FROM caddy:2-alpine AS runtime
COPY --from=build /repo/apps/web/build /srv
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
