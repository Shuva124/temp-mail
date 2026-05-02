import express from "express";
import dotenv from "dotenv";
import mailRoutes from "./routes/mail.routes.js";
import addressRoutes from "./routes/addressRoute.js";

dotenv.config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ ADD THIS LINE
app.use("/api/address", addressRoutes);

// existing
app.use("/api/webhook", mailRoutes);

app.listen(3000, () => {
  console.log(`Server running on port 3000`);
});