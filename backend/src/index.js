import express from "express";
import "./jobs/cleanup.job.js"

const app = express();

import addressRoute from "./routes/addressRoute.js";

app.use("/api/address", addressRoute);
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});