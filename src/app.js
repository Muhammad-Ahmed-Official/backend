import express from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import cookieParser from "cookie-parser";
import swaggerDocs from "./config/swagger.js";
import authRouter from "./routes/auth.route.js";
import projectRouter from "./routes/project.route.js";
import proposalRouter from "./routes/proposal.route.js";
import walletRouter from "./routes/wallet.route.js";
import disputeRouter from "./routes/dispute.route.js";
import notificationRouter from "./routes/notification.route.js";
import reviewRouter from "./routes/review.route.js";
import freelancerRouter from "./routes/freelancer.route.js";
import serviceRouter from "./routes/service.route.js";


import adminRouter from "./routes/admin.route.js";
import adminDisputeRouter from "./routes/admin_dispute.route.js";
import chatRouter from "./routes/chat.route.js";
import milestoneRouter from "./routes/milestone.route.js";
import { verifyJwt } from "./middleware/auth.middleware.js";
import {
  getChatUserProfile,
  deleteMessage,
  updateMessage,
} from "./controllers/chat.controller.js";


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
      'http://10.0.11.195:8081',
      'http://10.0.11.195:3000',
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


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome to My Page")
})

// Swagger Documentation
swaggerDocs(app);

// Routes
app.get("/api/v1/test-connection", (req, res) => res.json({ message: "Server is reachable!" }));
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/admin/disputes", adminDisputeRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/proposals", proposalRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/disputes", disputeRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/freelancers", freelancerRouter);
app.use("/api/v1/milestones", milestoneRouter);
app.get("/api/v1/chats/profile/:userId", verifyJwt, getChatUserProfile);
app.delete("/api/v1/chats/:messageId", verifyJwt, deleteMessage);
app.patch("/api/v1/chats/:messageId", verifyJwt, updateMessage);
app.use("/api/v1/chats", chatRouter);
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