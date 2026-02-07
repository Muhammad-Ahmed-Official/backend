/**
 * Load .env from backend root first, before any other code that reads process.env.
 * This ensures env vars are available even when the process is started from a different cwd.
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const result = dotenv.config({ path: path.resolve(__dirname, "../.env") });
if (result.error && process.env.NODE_ENV !== "production") {
  console.warn("[loadEnv] Could not load .env file:", result.error.message);
}
