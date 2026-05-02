import cron from "node-cron";
import pool from "../controllers/db.js";

cron.schedule("*/30 * * * *", async () => {
  try {
    // console.log("Running cleanup job...");

    const res = await pool.query(`
      DELETE FROM addresses
      WHERE deletion_time <= NOW()
      RETURNING *;
    `);

    // console.log(`Deleted ${res.rowCount} expired addresses`);
  } catch (err) {
    console.error("Cron job error:", err);
  }
});