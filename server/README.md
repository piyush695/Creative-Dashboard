# `server/` — backend code

All server-side logic lives here, kept separate from the frontend (`app/` pages,
`components/`, `hooks/`). This is a single Next.js app, so the boundary is
enforced by convention + `server-only` guards rather than a separate process.

```
server/
  actions/            Server Actions ('use server') called from the UI
    ads.ts            ad data reads
    auth-actions.ts   sign-in / sign-up / verification
    platform-actions.ts
    profile-actions.ts
    studio-actions.ts
  auth.ts             NextAuth setup (+ auth.config.ts)
  auth.config.ts
  mongodb-client.ts   Mongo connection  (server-only)
  mail.ts             transactional email (server-only)
  image-cache.ts      in-memory image cache (server-only)
  realtime-services/  external ad-platform API clients (Meta, Google, AdRoll)
  ai-studio/          AI Studio generation, storage, DB helpers
```

## Boundaries
- **Frontend** imports backend only through `server/actions/*` (Server Actions)
  and the route handlers in `app/api/*`. UI never imports DB/mail/etc directly.
- **Shared, client-safe** helpers stay in `lib/` (`utils`, `types`, `platforms`,
  `metric-colors`) and may be imported by both sides.
- Pure infrastructure modules (`mongodb-client`, `mail`, `image-cache`) import
  `server-only`, so accidentally pulling them into a client bundle fails the build.

Import via the `@/server/*` path alias, e.g. `import { auth } from "@/server/auth"`.
