const express = require("express");
const router = express.Router();
const axios = require("axios");
const supabase = require("../config/db");

// ================= VERIFY =================
router.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] &&
    req.query["hub.verify_token"] === process.env.VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  return res.sendStatus(403);
});

// ================= HELPERS =================
async function getUser(phone) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .single();

  return data || { phone, step: "start", temp_value: null };
}

async function setUser(phone, step, temp_value = null) {
  await supabase.from("users").upsert({ phone, step, temp_value });
}

// ================= DATE HELPERS =================
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday

  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// ================= MAIN =================
router.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const text = msg.text?.body?.trim().toLowerCase();

    let user = await getUser(from);
    let step = user.step;
    let reply = "";

    // ================= MENU =================
    if (text === "hi" || step === "start") {
      reply = `👋 Vanakkam! *DOSA BATTER*

1. Enter Stock Count
2. Sales Starts
3. How many sales done
4. Daily Sales Report
5. Weekly Sales Report
6. Monthly Sales Report`;

      await setUser(from, "menu");
    }

    // ================= STOCK ENTRY =================
    else if (step === "menu" && text === "1") {
      reply = "25rs batter ethana?";
      await setUser(from, "stock_25");
    }

    else if (step === "stock_25") {
      await setUser(from, "stock_35", text);
      reply = "35rs batter ethana?";
    }

    else if (step === "stock_35") {
      const stock25 = parseInt(user.temp_value);
      const stock35 = parseInt(text);

      await supabase.from("stock").insert([
        {
          phone: from,
          initial_25: stock25,
          initial_35: stock35,
          current_25: stock25,
          current_35: stock35,
          status: "open",
        },
      ]);

      reply = "✅ Stock saved successfully!";
      await setUser(from, "menu");
    }

    // ================= START SALES =================
    else if (step === "menu" && text === "2") {
      reply = `🟢 Sales Started!

Send:
1 = 25rs
2 = 35rs`;

      await setUser(from, "sales_mode");
    }

    // ================= SALES MODE =================
    else if (step === "sales_mode") {
      const { data } = await supabase
        .from("stock")
        .select("*")
        .eq("phone", from)
        .order("created_at", { ascending: false })
        .limit(1);

      let stock = data?.[0];

      if (!stock) {
        reply = "❌ Please enter stock first";
        await setUser(from, "menu");
      } else {
        if (text === "1" && stock.current_25 > 0) {
          stock.current_25--;

          await supabase.from("sales").insert([
            { phone: from, price: 25 },
          ]);
        }

        else if (text === "2" && stock.current_35 > 0) {
          stock.current_35--;

          await supabase.from("sales").insert([
            { phone: from, price: 35 },
          ]);
        } else {
          reply = "⚠️ Invalid input. Send 1 or 2 only.";
        }

        await supabase
          .from("stock")
          .update({
            current_25: stock.current_25,
            current_35: stock.current_35,
          })
          .eq("id", stock.id);

        // AUTO CLOSE
        if (stock.current_25 === 0 && stock.current_35 === 0) {
          reply = `🎉 Ellaam sale aagiduchu!
Sales Closed ✅`;

          await setUser(from, "menu");
        } else if (!reply) {
          reply = `Remaining:
25rs: ${stock.current_25}
35rs: ${stock.current_35}`;
        }
      }
    }

    // ================= SALES SUMMARY =================
    else if (step === "menu" && text === "3") {
      const { data } = await supabase
        .from("sales")
        .select("*")
        .eq("phone", from);

      let c25 = 0, c35 = 0;
      data.forEach(r => r.price === 25 ? c25++ : c35++);

      reply = `📊 Sales Summary

25rs:
Count: ${c25}
Amount: ₹${c25 * 25}

35rs:
Count: ${c35}
Amount: ₹${c35 * 35}

Total: ₹${c25 * 25 + c35 * 35}`;
    }

    // ================= DAILY =================
    else if (step === "menu" && text === "4") {
      const { start, end } = getTodayRange();

      const { data } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      let c25 = 0, c35 = 0;
      data.forEach(r => r.price === 25 ? c25++ : c35++);

      reply = `📅 Daily Report

25rs: ${c25} → ₹${c25 * 25}
35rs: ${c35} → ₹${c35 * 35}

Total: ₹${c25 * 25 + c35 * 35}`;
    }

    // ================= WEEKLY =================
    else if (step === "menu" && text === "5") {
      const { start, end } = getWeekRange();

      const { data } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      let c25 = 0, c35 = 0;
      data.forEach(r => r.price === 25 ? c25++ : c35++);

      reply = `📆 Weekly Report

25rs: ${c25} → ₹${c25 * 25}
35rs: ${c35} → ₹${c35 * 35}

Total: ₹${c25 * 25 + c35 * 35}`;
    }

    // ================= MONTH ASK =================
    else if (step === "menu" && text === "6") {
      reply = "Enter month (1-12)";
      await setUser(from, "month_input");
    }

    else if (step === "month_input") {
      const month = parseInt(text) - 1;
      const year = new Date().getFullYear();

      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);

      const { data } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      let c25 = 0, c35 = 0;
      data.forEach(r => r.price === 25 ? c25++ : c35++);

      reply = `📊 Monthly Report

25rs: ${c25} → ₹${c25 * 25}
35rs: ${c35} → ₹${c35 * 35}

Total: ₹${c25 * 25 + c35 * 35}`;

      await setUser(from, "menu");
    }

    // ================= DEFAULT =================
    else {
      reply = "Type 'Hi' to start";
      await setUser(from, "start");
    }

    // ================= SEND =================
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

module.exports = router;