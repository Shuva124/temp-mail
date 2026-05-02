import express from "express";
import dotenv from "dotenv";
import mailRoutes from "./routes/mail.routes.js";
import addressRoutes from "./routes/addressRoute.js";
import "./jobs/cleanup.job.js"

dotenv.config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/address", addressRoutes);

app.use("/api/webhook", mailRoutes);
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});