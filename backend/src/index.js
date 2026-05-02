import express from "express";
import dotenv from "dotenv";
import mailRoutes from "./routes/mail.routes.js";
import addressRoutes from "./routes/addressRoute.js";
import "./jobs/cleanup.job.js"
import cors from "cors";

const app = express();

app.use(cors());

app.use(express.json());
dotenv.config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello there");
})

app.use("/api/address", addressRoutes);

app.use("/api/webhook", mailRoutes);
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});