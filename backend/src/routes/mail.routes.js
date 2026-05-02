import express from "express";
import { handleIncomingMail, getEmails } from "../controllers/mail.controller.js";

const router = express.Router();

// Mailgun webhook
router.post("/mailgun", handleIncomingMail);

// Get inbox
router.get("/emails/:address", getEmails);

export default router;