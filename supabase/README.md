# Cura Journal Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/journal_entries.sql`.
3. Add these variables to `.env.local`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Journal entries are saved through `POST /api/journal` and loaded through `GET /api/journal?deviceId=...`.

The current implementation stores entries by a browser-generated `device_id` in localStorage. Add Supabase Auth later if you want account-based journals.
