# Chat – Database setup (Supabase)

Real-time chat uses the **`chats`** table. Do the following in Supabase.

## 1. Create the `chats` table

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Open **`backend/database/chat_schema.sql`** in your repo and copy its contents.
3. Paste into a new query and **Run**.

This will:

- Create the **`chats`** table with:
  - `id` (UUID, primary key)
  - `sender_id` → `users(id)`
  - `receiver_id` → `users(id)`
  - `message` (TEXT)
  - `project_id` → `projects(id)` (optional, for project-scoped threads)
  - `read` (boolean, default false)
  - `created_at`, `updated_at` (timestamptz)
- Add indexes on `sender_id`, `receiver_id`, `project_id`, `created_at`.
- Add a trigger to keep `updated_at` in sync on update.

## 2. Check table and FKs

- In **Table Editor**, confirm **`chats`** exists.
- Confirm foreign keys:
  - `chats_sender_id_fkey` → `users(id)`
  - `chats_receiver_id_fkey` → `users(id)`
  - `chats_project_id_fkey` → `projects(id)`

If Supabase generated different FK names, the backend joins use:

- `users!chats_sender_id_fkey`
- `users!chats_receiver_id_fkey`
- `projects!chats_project_id_fkey`

So the FK on `sender_id` must reference `users(id)`, etc. Names can differ as long as the columns and referenced tables match.

## 3. Row Level Security (optional)

If you use RLS on other tables:

- Either **disable RLS** on `chats` (backend uses service role and bypasses RLS), or
- Add policies that allow your backend role (e.g. service role) to SELECT/INSERT/UPDATE on `chats`.

If the backend uses the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`), it bypasses RLS; no policy is required for the API to work.

## 4. Summary

| Step | Action |
|------|--------|
| 1 | Run `backend/database/chat_schema.sql` in Supabase SQL Editor |
| 2 | Confirm `chats` exists and FKs point to `users` and `projects` |
| 3 | (Optional) Configure RLS if you use it elsewhere |

After this, the chat API and Socket.io messaging will work against your Supabase database.
