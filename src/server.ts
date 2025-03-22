import express, { Express, Request, Response, NextFunction } from "express";
const app = express();
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bodyParser from "body-parser";
import postRoutes from "./routes/posts_routes";
import commentRoutes from "./routes/comments_routes";
import authRoutes from "./routes/auth_routes";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import fileRoutes from "./routes/file_routes";
import path from "path";
import cors from "cors";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Enable CORS for your frontend (localhost:5173)
app.use(
  cors({
    origin: "http://localhost:5173", // Change this to match your frontend URL
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  next();
});
const delay = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }
  setTimeout(() => next(), 500);
};

app.use("/posts", postRoutes);
app.use("/api/posts", postRoutes);
app.use("/comments", delay, commentRoutes);
app.use("/auth", delay, authRoutes);
app.use("/public", express.static("public"));
app.use("/storage", express.static("storage"));
app.use("/files", fileRoutes);
app.use("/files/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(express.static("front"));

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hobby Connect REST API",
      version: "1.0.0",
      description: "REST server including authentication using JWT",
    },
    servers: [
      { url: "http://localhost:" + process.env.PORT },
      { url: "http://10.10.246.49" },
      { url: "https://10.10.246.49" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};
const specs = swaggerJsDoc(options);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

const initApp = async () => {
  return new Promise<Express>((resolve, reject) => {
    const db = mongoose.connection;
    db.on("error", (error) => console.error(error));
    db.once("open", () => {
      console.log("Connected to Database");
    });

    if (process.env.DB_CONNECTION === undefined) {
      console.error("DB_CONNECTION is not defined");
      reject();
    } else {
      mongoose.connect(process.env.DB_CONNECTION).then(() => {
        resolve(app);
      });
    }
  });
};

export default initApp;
