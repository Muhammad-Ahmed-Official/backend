# Proposal Accept/Reject 500 – Exact Cause & Fix

## You do NOT need more RLS

Your backend log shows: **`[Supabase] Using service role key (RLS bypassed for backend operations).`**

So the backend **already bypasses RLS**. Adding more RLS on Supabase will not fix this and can make things worse.

---

## What’s actually going wrong

1. **GET /proposals/client** works → returns 1 proposal (id `6a0bd39a-34fb-4b6b-b08d-276edeeb5d61`).
2. **PUT /proposals/:id/status** returns **500** and "Proposal not found".

So either:

- **A)** `Proposal.findById(id)` returns `null` (no row with that `id`), or  
- **B)** `Proposal.findById(id)` finds the row, but `Proposal.findByIdAndUpdate(id, { status })` updates **0 rows** and Supabase returns `PGRST116` (no row returned).

With the **service role key**, RLS is off. So if the update affects 0 rows, the only remaining reasons are:

1. **Wrong primary key column name**  
   Code uses `.eq('id', id)`. If your `proposals` table uses another column for the primary key (e.g. `proposal_id`, `uuid`), the filter won’t match any row.

2. **No row with that `id`**  
   The row might have been deleted, or the `id` might be from another env/DB.

3. **Table/schema mismatch**  
   Backend is talking to a different project/schema than the one where you see the proposal in the dashboard.

---

## What was changed in the backend

1. **asyncHandler**  
   Uses `error.statusCode` when present (e.g. `ApiError`). So "Proposal not found" from the API can now return **404** instead of always **500**.

2. **Proposal model**  
   When Supabase returns “no rows” (e.g. `PGRST116`), the code now throws `ApiError(404, 'Proposal not found')` so the HTTP status is **404** and the handler can send it correctly.

After restarting the backend, if you still get “Proposal not found”, check whether the response is **404** or **500** and look at the **backend terminal** when you click Reject:

- **`[Backend] updateProposalStatus: proposal found`** → `findById` succeeded; the failure is in **findByIdAndUpdate** (update matched 0 rows).
- **`[Proposal] findByIdAndUpdate Supabase error:`** → Logs the Supabase `code` and `message` for that update.

---

## Supabase checks (do these)

Run in **Supabase Dashboard → SQL Editor**:

**1. List columns of `proposals` (must have `id`):**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'proposals'
ORDER BY ordinal_position;
```

The primary key column used in the backend must be named **`id`** (lowercase). If it’s something else (e.g. `proposal_id`), the backend’s `.eq('id', id)` will never match and the update will affect 0 rows.

**2. Check if the proposal row exists:**

```sql
SELECT id, project_id, status
FROM proposals
WHERE id = '6a0bd39a-34fb-4b6b-b08d-276edeeb5d61';
```

- If this returns **no rows** → that proposal doesn’t exist in this DB/schema (wrong env, or row was deleted).
- If it returns **one row** → the row exists; then the problem is likely the **column name** used in the filter (see above) or the backend talking to a different project.

**3. If the primary key column is NOT `id`**

Then in the backend you must use that column name everywhere (e.g. in `proposal.models.js`, replace `.eq('id', id)` with `.eq('your_actual_pk_column', id)` and use the same column in the Proposal class and any other queries on `proposals`).

---

## If UPDATE works in SQL but not from backend

- The backend now uses a **fresh admin client** for the update (`getSupabaseAdmin()`), so the service role key is read from `process.env` at request time.
- If it still returns 0 rows, **temporarily disable RLS** on `proposals` to confirm RLS is the cause. In Supabase SQL Editor run:
  ```sql
  ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;
  ```
  Then try Accept/Reject from the UI again. If it works, re-enable RLS and fix the policy:
  ```sql
  ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
  ```

## Summary

- **Do not add more RLS** to fix this; the app is already using the service role and bypassing RLS.
- **Exact cause** when you still get "Proposal not found" with service role: either no row with that `id`, or the update filter uses a column name that doesn’t match your table (e.g. using `id` when the PK is something else), or a different Supabase project/schema.
- Use the SQL checks above and the new backend logs (and 404 vs 500) to see which of these applies and fix the schema or column name accordingly.
