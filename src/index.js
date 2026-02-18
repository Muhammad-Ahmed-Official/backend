import "./loadEnv.js";
import { app } from "./app.js";
import { SocketService } from "./services/socket.service.js";
import { supabase } from "./config/supabase.js";

const DEFAULT_PORT = parseInt(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10; // Maximum ports to try (3000-3009)

// Run pending migrations before starting the server
async function runMigrations() {
  // Check if seen_at column already exists by querying it
  const { error: checkError } = await supabase
    .from('chats')
    .select('seen_at')
    .limit(1);

  if (!checkError) {
    console.log('[Migration] chats.seen_at column is ready.');
    return;
  }

  // Column missing - try adding via RPC function (created by migrate_seen_at.sql)
  try {
    const { error: rpcError } = await supabase.rpc('add_seen_at_column');
    if (!rpcError) {
      console.log('[Migration] chats.seen_at column added via RPC.');
      return;
    }
  } catch (_) {}

  // RPC not available - show instructions
  console.warn('='.repeat(70));
  console.warn('[Migration] seen_at column missing in chats table!');
  console.warn('[Migration] Run this file in Supabase SQL Editor:');
  console.warn('[Migration]   backend/database/migrate_seen_at.sql');
  console.warn('[Migration] Or run this SQL directly:');
  console.warn('[Migration]   ALTER TABLE chats ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ DEFAULT NULL;');
  console.warn('='.repeat(70));
}

async function startServer() {
  await runMigrations();

  let currentPort = DEFAULT_PORT;
  let attempts = 0;
  let server;

  while (attempts < MAX_PORT_ATTEMPTS) {
    try {
      server = await new Promise((resolve, reject) => {
        const httpServer = app.listen(currentPort, () => {
          console.log(`Server is running on port ${currentPort}`);
          console.log(`📚 Swagger UI available at http://localhost:${currentPort}/api-docs`);
          if (currentPort !== DEFAULT_PORT) {
            console.log(`⚠️  Port ${DEFAULT_PORT} was busy, using port ${currentPort} instead`);
          }
          resolve(httpServer);
        });

        httpServer.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            reject(error);
          } else {
            reject(error);
          }
        });
      });
      const socketService = new SocketService(server);
      socketService.initListener();
      app.set('io', socketService.io);
      console.log('Socket.io chat listener attached');
      break; // Successfully started, exit loop
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        attempts++;
        currentPort++;
        console.log(`Port ${currentPort - 1} is busy, trying port ${currentPort}...`);
      } else {
        console.error('Error starting server:', error);
        process.exit(1);
      }
    }
  }

  if (attempts >= MAX_PORT_ATTEMPTS) {
    console.error(`❌ Could not find an available port after ${MAX_PORT_ATTEMPTS} attempts`);
    process.exit(1);
  }
}

startServer();