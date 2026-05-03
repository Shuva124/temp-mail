import express from "express";
import { handleIncomingMail, getEmails } from "../controllers/mail.controller.js";
import multer from "multer";
const upload = multer();
const router = express.Router();

router.post("/mailgun", upload.any(), handleIncomingMail);

router.get("/emails/:address", getEmails);

export default router;