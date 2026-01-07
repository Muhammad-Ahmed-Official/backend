// Vercel Serverless Function Entry Point
import dotenv from "dotenv";
import { app } from "../src/app.js";

// Load environment variables
dotenv.config();

// Export the Express app as the default export for Vercel
export default app;

