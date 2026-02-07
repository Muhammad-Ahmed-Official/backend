/**
 * Test Socket.io chat: connect with JWT, join room (optionally project), send message, expect new_message.
 * Backend must be running (npm run dev).
 *
 * Usage from backend folder:
 *   node tests/test-chat-socket.js
 *
 * Env (in .env or set before run):
 *   BASE_URL=http://localhost:3000
 *   TEST_EMAIL=your@email.com
 *   TEST_PASSWORD=yourpassword
 *   RECEIVER_ID=uuid-of-other-user   (required for send_message)
 *   PROJECT_ID=uuid-of-project      (optional, for project-scoped chat)
 *
 * Or pass a token instead of login:
 *   ACCESS_TOKEN=your_jwt node tests/test-chat-socket.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { io } from 'socket.io-client';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
let TEST_EMAIL = process.env.TEST_EMAIL;
let TEST_PASSWORD = process.env.TEST_PASSWORD;
let RECEIVER_ID = process.env.RECEIVER_ID;
let PROJECT_ID = process.env.PROJECT_ID || null;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

/** Fetch a receiver user id and optional project id from DB when not set. */
async function fetchReceiverAndProject() {
  const { supabase } = await import('../src/config/supabase.js');
  if (!RECEIVER_ID) {
    const { data: users } = await supabase.from('users').select('id, email').limit(10);
    if (users?.length) {
      const other = users.find((u) => u.email !== TEST_EMAIL) || users[0];
      RECEIVER_ID = other.id;
      console.log('   Auto RECEIVER_ID:', RECEIVER_ID, '(from DB)');
    }
  }
  if (!PROJECT_ID) {
    const { data: projects } = await supabase.from('projects').select('id').limit(1);
    if (projects?.length) {
      PROJECT_ID = projects[0].id;
      console.log('   Auto PROJECT_ID:', PROJECT_ID, '(from DB)');
    }
  }
}

async function getToken() {
  if (ACCESS_TOKEN) return ACCESS_TOKEN;
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Set ACCESS_TOKEN or both TEST_EMAIL and TEST_PASSWORD in .env');
  }
  const res = await fetch(`${BASE_URL}/api/v1/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || 'Login failed');
  const token = data?.data?.accessToken || data?.accessToken;
  if (!token) throw new Error('No accessToken in login response');
  return token;
}

function runSocketTest() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Timeout: no new_message received in 10s'));
    }, 10000);

    const socket = io(BASE_URL, {
      auth: { token: null },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('   Socket connected');
      if (!RECEIVER_ID) {
        clearTimeout(timeout);
        socket.disconnect();
        resolve();
        console.log('   Skipped send_message (RECEIVER_ID not set). Set RECEIVER_ID and PROJECT_ID to test full flow.');
        return;
      }
      socket.emit('join_room', { receiverId: RECEIVER_ID, projectId: PROJECT_ID });
      socket.emit('send_message', {
        receiverId: RECEIVER_ID,
        message: 'Test from script (project chat)' + (PROJECT_ID ? ` [project: ${PROJECT_ID.slice(0, 8)}...]` : ''),
        projectId: PROJECT_ID,
      });
      console.log('   Sent send_message to', RECEIVER_ID, PROJECT_ID ? `(project: ${PROJECT_ID.slice(0, 8)}...)` : '');
    });

    socket.on('new_message', (payload) => {
      clearTimeout(timeout);
      socket.disconnect();
      console.log('   Received new_message:', payload?.id, payload?.message);
      resolve();
    });

    socket.on('error', (payload) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(new Error(payload?.message || 'Socket error'));
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function main() {
  console.log('Socket.io chat test\n');
  console.log('BASE_URL:', BASE_URL);
  console.log('RECEIVER_ID:', RECEIVER_ID || '(not set – connect/join only)');
  console.log('PROJECT_ID:', PROJECT_ID || '(not set)\n');

  let token;
  try {
    console.log('1. Getting JWT...');
    token = await getToken();
    console.log('   OK: got token\n');
  } catch (e) {
    console.error('   FAIL:', e.message);
    console.error('\n   Set ACCESS_TOKEN or TEST_EMAIL + TEST_PASSWORD in .env (and RECEIVER_ID for send test).');
    process.exit(1);
  }

  if (!RECEIVER_ID || !PROJECT_ID) {
    console.log('2. Resolving RECEIVER_ID / PROJECT_ID from DB...');
    try {
      await fetchReceiverAndProject();
    } catch (e) {
      console.log('   (skip)', e.message);
    }
    console.log('');
  }

  const socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  const timeout = setTimeout(() => {
    socket.disconnect();
    console.error('\n   FAIL: Timeout – no new_message in 10s.');
    process.exit(1);
  }, 10000);

  socket.on('connect', () => {
    console.log('3. Socket connected');
    if (!RECEIVER_ID) {
      clearTimeout(timeout);
      socket.disconnect();
      console.log('   Skipped send_message (RECEIVER_ID not set).');
      console.log('\n   To test full flow: set RECEIVER_ID (and optionally PROJECT_ID) in .env, then run again.');
      console.log('Socket.io check passed (connect + auth OK).\n');
      process.exit(0);
    }
    socket.emit('join_room', { receiverId: RECEIVER_ID, projectId: PROJECT_ID });
    socket.emit('send_message', {
      receiverId: RECEIVER_ID,
      message: 'Test from script (project chat)' + (PROJECT_ID ? ` [project: ${PROJECT_ID.slice(0, 8)}...]` : ''),
      projectId: PROJECT_ID,
    });
    console.log('   Joined room and sent message to', RECEIVER_ID);
  });

  socket.on('new_message', (payload) => {
    clearTimeout(timeout);
    socket.disconnect();
    console.log('4. Received new_message:', payload?.id, '–', payload?.message);
    console.log('\nSocket.io chat test passed (connect, join_room, send_message, new_message).\n');
    process.exit(0);
  });

  socket.on('error', (payload) => {
    clearTimeout(timeout);
    socket.disconnect();
    console.error('   FAIL:', payload?.message || 'Socket error');
    process.exit(1);
  });

  socket.on('connect_error', (err) => {
    clearTimeout(timeout);
    console.error('   FAIL: connect_error', err.message);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
