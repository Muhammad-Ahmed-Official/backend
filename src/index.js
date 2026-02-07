import "./loadEnv.js";
import { app } from "./app.js";

const DEFAULT_PORT = parseInt(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10; // Maximum ports to try (3000-3009)

async function startServer() {
  let currentPort = DEFAULT_PORT;
  let attempts = 0;

  while (attempts < MAX_PORT_ATTEMPTS) {
    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(currentPort, () => {
          console.log(`Server is running on port ${currentPort}`);
          console.log(`📚 Swagger UI available at http://localhost:${currentPort}/api-docs`);
          if (currentPort !== DEFAULT_PORT) {
            console.log(`⚠️  Port ${DEFAULT_PORT} was busy, using port ${currentPort} instead`);
          }
          resolve(server);
        });

        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            reject(error);
          } else {
            reject(error);
          }
        });
      });
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