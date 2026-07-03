# ── deps: install Linux-native node_modules (sharp gets linux-musl binaries) ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ── builder ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Secrets are NOT baked in (.env is dockerignored) — runtime env comes from
# Cloud Run service configuration.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── runner ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Fontconfig runtime — sharp's bundled libvips renders the SVG text (Design
# Engine + text overlay) but resolves fonts through fontconfig, which needs the
# config infrastructure present in the image.
RUN apk add --no-cache fontconfig

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Output tracing only bundles build-time imports — these are read at RUNTIME:
#   assets/fonts  → Montserrat/Poppins TTFs for the creative engines
#   config/       → active-offers.json (compliance gate; API writes it)
COPY --from=builder --chown=nextjs:nodejs /app/assets ./assets
COPY --from=builder --chown=nextjs:nodejs /app/config ./config

# Standalone server (server.js at /app → process.cwd() = /app, matching the
# assets/config/public paths above)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The repo's fonts.conf carries Windows dev paths — replace with the container
# layout. MUST run AFTER every COPY above: Next's output tracing bundles
# assets/fonts/fonts.conf into the standalone output, so copying standalone
# later would overwrite this file with the Windows version (fontconfig then
# finds zero fonts → every glyph renders as a tofu box; happened live 2026-07-03).
RUN printf '<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <dir>/app/assets/fonts</dir>\n  <cachedir>/tmp/fontcache</cachedir>\n</fontconfig>\n' > ./assets/fonts/fonts.conf \
  && find / -path /proc -prune -o -name "fonts.conf" -print 2>/dev/null | grep -v "^/etc" | while read f; do [ "$f" != "/app/assets/fonts/fonts.conf" ] && cp /app/assets/fonts/fonts.conf "$f" || true; done \
  && chown nextjs:nodejs ./assets/fonts/fonts.conf
ENV FONTCONFIG_FILE=/app/assets/fonts/fonts.conf

# Brand Assets uploads (public/brand) and Active Offers edits (config/) write
# to the filesystem — give the runtime user ownership. NOTE: Cloud Run's FS is
# in-memory and per-instance; these edits do not survive restarts/scale-out.
RUN chown -R nextjs:nodejs ./public ./config

USER nextjs

EXPOSE 3000

# Cloud Run injects PORT (8080) at runtime; server.js honors it. 3000 = local default.
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
