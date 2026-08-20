# FrameTap Supabase setup

FrameTap works without Supabase in local preview mode. To make album pages and photos available online through the NFC link, connect a Supabase project.

## 1. Create a Supabase project

In the Supabase dashboard:

- Enable **Authentication > Sign In / Providers > Anonymous sign-ins**.
- Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).

## 2. Add environment variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Then fill in:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
VITE_SUPABASE_STORAGE_BUCKET=album-photos
```

For GitHub Pages, add the same values as repository secrets or environment variables used by the build.

## 3. Deploy

Run:

```bash
npm run build:pages
```

When configured, new images are uploaded to Supabase Storage and album metadata is saved in the `albums` table. Without these variables, FrameTap keeps using local browser storage.
