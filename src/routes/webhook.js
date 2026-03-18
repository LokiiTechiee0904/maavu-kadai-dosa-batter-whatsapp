const express = require('express');
const router = express.Router();

const { sendMessage } = require('../services/whatsappService');
const { getSession, setState, setTemp } = require('../services/sessionService');
const {
  createStock,
  startSales,
  handleSale,
  getToday,
  getWeekly,
  getMonthly
} = require('../services/salesService');

const { formatReport } = require('../utils/helpers');

router.post('/', async (req, res) => {
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const phone = msg.from;
    const text = msg.text?.body?.trim();

    const session = await getSession(phone);

    // HI MENU
    if (text?.toLowerCase() === "hi") {
      await setState(phone, "IDLE");
      return sendMessage(phone,
`🙏 DOSA BATTER

1 Enter Stock
2 Start Sales
3 Check Sales
4 Daily Report
5 Weekly Report
6 Monthly Report`);
    }

    // STOCK FLOW
    if (session.state === "WAIT_25") {
      await setTemp(phone, parseInt(text));
      await setState(phone, "WAIT_35");
      return sendMessage(phone, "Enter 35rs batter count:");
    }

    if (session.state === "WAIT_35") {
      const stock25 = session.temp_value;
      const stock35 = parseInt(text);

      await createStock(phone, stock25, stock35);
      await setState(phone, "IDLE");

      return sendMessage(phone, "✅ Stock Saved");
    }

    // SALES MODE
    if (session.state === "SALES_MODE") {
      const result = await handleSale(phone, parseInt(text));

      if (result === "DONE") {
        await setState(phone, "IDLE");
        return sendMessage(phone, "✅ All Sold! Back to Home");
      }

      return res.sendStatus(200);
    }

    // MENU OPTIONS
    switch (text) {

      case "1":
        await setState(phone, "WAIT_25");
        return sendMessage(phone, "Enter 25rs batter count:");

      case "2":
        await startSales(phone);
        await setState(phone, "SALES_MODE");
        return sendMessage(phone, "🟢 Sales Started\n1=25rs\n2=35rs");

      case "3": {
        const d = await getToday(phone);
        if (!d) return sendMessage(phone, "No data");

        return sendMessage(phone,
          formatReport("📊 Sales", d.sales_25, d.sales_35)
        );
      }

      case "4": {
        const d = await getToday(phone);
        if (!d) return sendMessage(phone, "No data");

        return sendMessage(phone,
          formatReport("📅 Daily Report", d.sales_25, d.sales_35)
        );
      }

      case "5": {
        const w = await getWeekly(phone);
        return sendMessage(phone,
          formatReport("📅 Weekly Report", w.total25, w.total35)
        );
      }

      case "6":
        await setState(phone, "WAIT_MONTH");
        return sendMessage(phone, "Enter month (1-12):");

      case "WAIT_MONTH":
        break;
    }

    // MONTH INPUT
    if (session.state === "WAIT_MONTH") {
      const m = parseInt(text);
      const data = await getMonthly(phone, m);

      await setState(phone, "IDLE");

      return sendMessage(phone,
        formatReport("📅 Monthly Report", data.total25, data.total35)
      );
    }

    return sendMessage(phone, "Send 'Hi' to start");

  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

module.exports = router;