const pool = require("../lib/db");
const generateAddress = require("../lib/emailGenerator");

exports.createAddress = async (req, res) => {
  try {
    while (true) {
      const address = generateAddress();

      try {
        const result = await pool.query(
          `INSERT INTO addresses (address)
           VALUES ($1)
           RETURNING *`,
          [address]
        );

        return res.json(result.rows[0]);

      } catch (err) {
        // duplicate address → retry
        if (err.code === "23505") continue;
        throw err;
      }
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create address" });
  }
};