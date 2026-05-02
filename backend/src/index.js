import express from "express";
const app = express();
const addressRoute = require("./src/route/addressRoute");


app.use("/api/address", addressRoute);
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});