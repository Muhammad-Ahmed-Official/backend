# How to check the chat implementation

Follow these steps in order to verify DB, backend, and frontend.

---

## 1. Database (Supabase)

**1.1 Table exists**

- Supabase Dashboard → **Table Editor** → open **`chats`**.
- You should see columns: `id`, `sender_id`, `receiver_id`, `message`, `project_id`, `read`, `created_at`, `updated_at`.

**1.2 Foreign keys**

- In **Table Editor** → **chats** → check that:
  - `sender_id` and `receiver_id` reference **users(id)**.
  - `project_id` references **projects(id)** (or is nullable with no FK if you skipped it).

**1.3 Automated check (optional)**

- From the **backend** folder run: `node tests/test-chat-db.js`
- It checks that the `chats` table exists and is readable. If it fails, run `backend/database/chat_schema.sql` in Supabase first.

**1.4 Quick insert (optional)**

- SQL Editor → run:

```sql
-- Replace USER_ID_1 and USER_ID_2 with real UUIDs from your users table
INSERT INTO chats (sender_id, receiver_id, message)
SELECT id, (SELECT id FROM users WHERE id != users.id LIMIT 1), 'Test message'
FROM users LIMIT 1;
```

- If it runs without error, the table and FKs are fine. You can delete the test row from Table Editor.

---

## 2. Backend – REST API

**2.1 Server and chat route**

- From project root: `cd backend && npm run dev`.
- Backend should start (e.g. port 3000) with no errors.
- In browser or Postman: `GET http://localhost:3000/api/v1/test-connection` → should return `{ "message": "Server is reachable!" }`.

**2.2 Chat endpoints (need a valid JWT)**

You must be logged in. Use a token from the frontend (e.g. after login, from devtools/AsyncStorage or your auth flow).

- **Get chat history**  
  `GET http://localhost:3000/api/v1/chats/history`  
  Headers: `Authorization: Bearer YOUR_ACCESS_TOKEN`  
  - 200 + JSON with `data` (array of conversations) = OK.
  - 401 = invalid/expired token.

- **Get messages with a user**  
  `GET http://localhost:3000/api/v1/chats/messages?receiverId=OTHER_USER_UUID`  
  Headers: `Authorization: Bearer YOUR_ACCESS_TOKEN`  
  - 200 + JSON with `data` (array of messages) = OK.

- **Send message**  
  `POST http://localhost:3000/api/v1/chats/send`  
  Headers: `Authorization: Bearer YOUR_ACCESS_TOKEN`, `Content-Type: application/json`  
  Body: `{ "receiverId": "OTHER_USER_UUID", "message": "Hello" }`  
  - 201 + JSON with `data` (the new message) = OK.

- **Unread count**  
  `GET http://localhost:3000/api/v1/chats/unread-count`  
  Headers: `Authorization: Bearer YOUR_ACCESS_TOKEN`  
  - 200 + `data.count` = OK.

If all of these return the expected status and shape, the chat REST implementation is working.

---

## 3. Backend – Socket.io

**3.1 Server logs**

- With backend running, you should not see any Socket-related errors on startup.
- When a client connects with a valid token, the server accepts the connection (no "Unauthorized" in logs if token is valid).

**3.2 Test with script (optional, project messaging)**

- Backend must be running: `npm run dev`.
- In another terminal, from **backend** folder:

  **Connect + auth only (no other user needed):**
  ```bash
  # Use your real login (or set ACCESS_TOKEN in .env)
  set TEST_EMAIL=your@email.com
  set TEST_PASSWORD=yourpassword
  npm run test:chat-socket
  ```
  You should see: Socket connected, then "Socket.io check passed".

  **Full flow (connect, join room, send message, receive new_message):**
  ```bash
  set TEST_EMAIL=your@email.com
  set TEST_PASSWORD=yourpassword
  set RECEIVER_ID=uuid-of-another-user
  set PROJECT_ID=uuid-of-a-project
  npm run test:chat-socket
  ```
  You should see: Socket connected, Joined room and sent message, Received new_message, then "Socket.io chat test passed".

- To get **RECEIVER_ID**: use another user's id from Supabase Table Editor → users, or from your app (e.g. profile/view). To get **PROJECT_ID**: use a project id from Table Editor → projects.
- Alternatively, use **ACCESS_TOKEN** instead of login: get the token after logging in (e.g. from frontend devtools / AsyncStorage), then `set ACCESS_TOKEN=that_token` and run the script with RECEIVER_ID and PROJECT_ID.

---

## 4. Frontend – App

**4.1 Messages tab**

- Log in → open the **Messages** tab (or the tab where you list conversations).
- Expected:
  - If no chats: empty state ("No conversations yet").
  - If there are chats: list of conversations with last message and time.
- Pull to refresh: list updates.
- Tap a conversation: navigates to ChatScreen with that user.

**4.2 ChatScreen – load and send**

- From Messages, tap a conversation (or open ChatScreen via Project Detail → Message).
- Expected:
  - Header shows the other user’s name.
  - Previous messages load (or empty if new chat).
  - You can type and send a message; it appears in the list and is stored (refresh or re-open to see it again).

**4.3 Real-time (Socket.io)**

- Use two accounts (e.g. two browsers or one browser + one incognito, or two devices).
- User A: open chat with User B.
- User B: open chat with User A.
- User A sends a message.
- Expected: User B sees the new message without refreshing (and vice versa).

**4.4 Typing indicator**

- User A: focus the input and start typing.
- Expected: User B sees "typing..." (or similar) in the chat. After User A stops typing (or sends), it disappears.

**4.5 Read receipt**

- User A sends a message. User B opens the conversation (or is already on it).
- Expected: User A sees a "Read" (or similar) near the last message after User B has viewed the chat.

**4.6 Online presence**

- User A and User B both logged in (both have the app open).
- Expected: On the Messages list, the other user shows as online (e.g. green dot). If one logs out or closes the app, the dot can disappear after disconnect.

**4.7 Project Detail → Message**

- Log in as client or freelancer → open a project that has a client and freelancer → tap **Message**.
- Expected: ChatScreen opens with the other party and (if implemented) project-scoped thread (`projectId` in params).

---

## 5. Quick checklist

| Step | What to check | Pass? |
|------|----------------|-------|
| 1.1 | `chats` table exists in Supabase | ☐ |
| 1.2 | FKs: sender_id, receiver_id → users; project_id → projects | ☐ |
| 1.3 | (Optional) `node tests/test-chat-db.js` passes from backend | ☐ |
| 2.1 | Backend runs; test-connection returns OK | ☐ |
| 2.2 | GET /chats/history and /chats/messages with token return 200 | ☐ |
| 2.2 | POST /chats/send with token returns 201 | ☐ |
| 3   | Socket.io accepts connection with valid token | ☐ |
| 4.1 | Messages tab shows list or empty state | ☐ |
| 4.2 | ChatScreen loads and sends messages | ☐ |
| 4.3 | New message appears on the other device without refresh | ☐ |
| 4.4 | Typing indicator appears for the other user | ☐ |
| 4.5 | Read receipt appears after other user views chat | ☐ |
| 4.6 | Online dot on Messages list | ☐ |
| 4.7 | Message from Project Detail opens correct chat | ☐ |

---

## 6. Common issues

- **401 on chat endpoints**  
  Token missing, expired, or wrong. Log in again and use the new access token.

- **chats table / FK errors**  
  Run `backend/database/chat_schema.sql` in Supabase and fix any FK/table name mismatches (e.g. `users` / `projects` must exist).

- **Socket connection fails**  
  Check backend CORS and that the frontend uses the same base URL as the API (e.g. `http://localhost:3000`). For mobile, use your machine’s IP and ensure the backend is listening on `0.0.0.0` or the correct interface.

- **No real-time updates**  
  Ensure Socket connects after login (check SocketContext and that token is sent in `auth.token`). Check browser/device console for Socket errors.

- **Empty Messages list**  
  Normal if no rows in `chats` yet. Send at least one message (via API or app) and refresh the list.

Once all steps in this checklist pass, the chat implementation is verified end-to-end.
