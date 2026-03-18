require('dotenv').config();
const express = require('express');
const webhook = require('./routes/webhook');

const app = express();
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.send("Maavu Kadai - DOSA BATTER WhatsApp Bot Running 🚀");
});

// ✅ FIXED ROUTE
app.use('/', webhook);

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running...");
});