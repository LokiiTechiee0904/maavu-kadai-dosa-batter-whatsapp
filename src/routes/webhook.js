const express = require("express");
const router = express.Router();
const axios = require("axios");

// ✅ VERIFY WEBHOOK (GET)
router.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// ✅ RECEIVE MESSAGE (POST) 🔥 THIS WAS MISSING
router.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.entry) {
      const msg = body.entry[0].changes[0].value.messages?.[0];

      if (msg) {
        const from = msg.from;
        const text = msg.text?.body;

        console.log("📩 Message:", text);

        // 🔥 SEND REPLY
        await axios.post(
          `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            text: { body: `You said: ${text}` }
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;