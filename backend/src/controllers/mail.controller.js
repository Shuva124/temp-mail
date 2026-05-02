import pool from "./db.js";   // 👈 SAME FOLDER

// 📩 Handle incoming Mailgun webhook
export const handleIncomingMail = async (req, res) => {
  try {
    const recipient = req.body.recipient;
    const sender = req.body.sender;
    const subject = req.body.subject;

    const body =
      req.body["body-plain"] ||
      req.body.body_plain ||
      req.body.body;

    console.log("Incoming mail:", { recipient, sender, subject });

    // Check address exists
    const addressRes = await pool.query(
      "SELECT id FROM addresses WHERE address = $1",
      [recipient]
    );

    if (addressRes.rows.length === 0) {
      return res.status(404).send("Address not found");
    }

    const address_id = addressRes.rows[0].id;

    // Insert email
    await pool.query(
      `INSERT INTO mail (address_id, email)
       VALUES ($1, $2::jsonb)`,
      [
        address_id,
        JSON.stringify({
          from: sender,
          subject,
          body,
        }),
      ]
    );

    return res.status(200).send("Email stored");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Server error");
  }
};



// 📥 Fetch inbox emails
export const getEmails = async (req, res) => {
  try {
    const { address } = req.params;

    const result = await pool.query(
      `SELECT m.* FROM mail m
       JOIN addresses a ON a.id = m.address_id
       WHERE a.address = $1
       ORDER BY m.id DESC`,
      [address]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).send("Error fetching emails");
  }
};