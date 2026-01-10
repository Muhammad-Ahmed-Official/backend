import express from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import cookieParser from "cookie-parser";
import swaggerDocs from "./config/swagger.js";
import authRouter from "./routes/auth.route.js";
import projectRouter from "./routes/project.route.js";
import proposalRouter from "./routes/proposal.route.js";


const app = express();
// Middleware Configurations
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.ALLOWED_ORIGIN_1,
      process.env.ALLOWED_ORIGIN_2,
      process.env.ALLOWED_ORIGIN_3,
      process.env.ALLOWED_ORIGIN_4,
      'https://freelanceing-frontend.vercel.app',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:8080',
      'http://192.168.100.146:8081',
      'http://192.168.100.146:19006',
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for development
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
}));


app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome to My Page")
})

// Swagger Documentation
swaggerDocs(app);

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/proposals", proposalRouter);
// app.use("/api/v1/post", postRouter);
// app.use("/api/v1/user", userRouter);
// app.use("/api/v1/comment", commentRouter);

// Handle Undefined Routes
app.all(/.*/, (req, res) => {
  res.status(StatusCodes.NOT_FOUND).send({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

export { app };