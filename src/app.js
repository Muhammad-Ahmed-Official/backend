import express from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import cookieParser from "cookie-parser";


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

// Routes
// app.use("/api/v1/auth", authRouter);
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