import express from "express";
import cors from "cors";
import { sendEmailOTP } from "./utils/sendEmail.js";
import { StatusCodes } from "http-status-codes";
import cookieParser from "cookie-parser";
import swaggerDocs from "./config/swagger.js";
import authRouter from "./routes/auth.route.js";


const app = express();
// Middleware Configurations
app.use(cors({
  origin: [process.env.ALLOWED_ORIGIN_1, process.env.ALLOWED_ORIGIN_2],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"]
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
// app.use("/api/v1/post", postRouter);
// app.use("/api/v1/user", userRouter);
// app.use("/api/v1/comment", commentRouter);

// Add this before "Handle Undefined Routes"
app.get("/test-email", async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "Please provide email query parameter",
      example: "/test-email?email=your-email@gmail.com"
    });
  }
  
  if (!process.env.PORTAL_EMAIL || !process.env.PORTAL_PASSWORD) {
    return res.status(500).json({
      status: "error",
      message: "Email configuration missing",
      required: ["PORTAL_EMAIL", "PORTAL_PASSWORD"]
    });
  }
  
  const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    const result = await sendEmailOTP(email, testOTP);
    return res.status(200).json({
      status: "success",
      message: "Test OTP email sent!",
      email: email,
      otp: testOTP,
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to send email",
      error: error.toString()
    });
  }
});
// Handle Undefined Routes
app.all(/.*/, (req, res) => {
  res.status(StatusCodes.NOT_FOUND).send({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

export { app };