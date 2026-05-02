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
app.use("/webhook", mailRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});