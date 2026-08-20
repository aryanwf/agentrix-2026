# Cura Journal Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/journal_entries.sql`, then `supabase/account_history.sql`.
3. Add these variables to `.env` (the project keeps all env vars there, not `.env.local`):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Journal entries are saved through `POST /api/journal`. Signed-in users load all entries through `GET /api/journal`; guests use `GET /api/journal?deviceId=...`.

Signed-in users can browse their journal pages and chat history at `/history`.
