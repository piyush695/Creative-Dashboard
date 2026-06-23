# Ad Library Uploads (manual fallback)

This folder is the manual alternative to the Meta Ad Library API sync. Drop ad
screenshots here and the Studio will treat them exactly like API-fetched ads —
extract per-ad patterns via Claude Vision and feed them into generation.

## How it works

1. Drop image files (`.png`, `.jpg`, `.jpeg`, `.webp`) into the brand subfolder.
2. In the dashboard: Studio → Ad Library tab → click **Sync from uploads**.
3. Each new file is upserted into the MongoDB `ad_library` collection.
4. Claude Vision extracts patterns (hook, layout, palette, psychology, etc.).
5. Studio generation reads top-N stored ads as reference images + pattern context.

The sync is idempotent — safe to run repeatedly. Existing ads update `lastSeenAt`;
patterns are only re-extracted if missing.

## Folder convention

```
public/ad-library-uploads/
  hola-prime/            ← source: own
    any-filename.png
    another.jpg
  ftmo/                  ← source: competitor
  funded-next/
  topstep/
  ... etc
```

The folder name = brand slug. `hola-prime/` is treated as our own ads (source:
own); every other folder is a competitor.

Brand slug → display name conversion is automatic (`hola-prime` → "Hola Prime").
Custom names are kept in `lib/ai-studio/ad-library-local-sync.ts` for the known
competitors (FTMO stays "FTMO", not "Ftmo").

To add a NEW brand, just create a new subfolder — no code change needed.

## File naming

Anything works. The filename (without extension) becomes the ad's stable ID
so re-runs upsert the same record. Recommended:

```
hola-prime/jan-26-flat-25-off.png
hola-prime/feb-26-2k-challenge.jpg
ftmo/january-2026-100k-program.png
```

## What about file size?

Keep originals under ~5 MB each. Anything served from `/public/...` ships to
the browser as-is on first view. The pattern extractor also base64-encodes
each image to send to Claude Vision — large files = slow + expensive.

## Privacy / git

These uploads are NOT tracked by git (see the `.gitignore` rule). They live
only in your local repo. If you deploy, you'll need to copy the folder up to
your production environment or wire S3 / Vercel Blob storage later.

## When the real Meta API is approved

This manual sync keeps working alongside the real one. They write to the same
collection. The Meta sync owns ads with real Meta IDs; local sync owns ads with
synthetic IDs prefixed `local-`. No collision.
