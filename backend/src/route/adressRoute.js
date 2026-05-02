const express = require("express");
const router = express.Router();
const { createAddress } = require("../controllers/addressController");

router.post("/create", createAddress);

module.exports = router;