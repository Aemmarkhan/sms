const express = require("express");
const bodyParser = require("body-parser");
const { MessagingResponse } = require("twilio").twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* ===============================
   SIMPLE SMS SCHEME DATA
================================= */

const schemes = {
  PMFBY: {
    name: "PMFBY – Crop Insurance",
    overview:
      "Pradhan Mantri Fasal Bima Yojana.\nLow premium crop insurance.",
    eligibility:
      "All farmers. Loanee compulsory. Non-loanee voluntary. Must be in notified area.",
    documents:
      "Aadhaar, Land Record, Bank Account, Crop details.",
    benefits:
      "• 2% Kharif, 1.5% Rabi\n• Covers drought, flood, pest\n• Post-harvest coverage",
    apply:
      "Apply at pmfby.gov.in or nearest bank/CSC.\nReport loss within 72 hrs."
  },

  PMKSY: {
    name: "PMKSY – Irrigation",
    overview:
      "Pradhan Mantri Krishi Sinchayee Yojana.\nHar Khet Ko Pani.",
    eligibility:
      "Farmers with land ownership/possession.",
    documents:
      "Aadhaar, Land document, Bank Account.",
    benefits:
      "• Subsidized drip irrigation\n• Rainwater harvesting\n• Reduced water use",
    apply:
      "Apply at District Agriculture Office."
  },

  SHC: {
    name: "SHC – Soil Health Card",
    overview:
      "Free soil testing every 2 years.",
    eligibility:
      "All farmers across India.",
    documents:
      "Aadhaar, Land Record.",
    benefits:
      "• Fertilizer recommendation\n• Improves yield\n• Reduces cost",
    apply:
      "Contact nearest Krishi Vigyan Kendra (KVK)."
  }
};

/* ===============================
   SIMPLE IN-MEMORY STATE
================================= */

const users = {};

/* ===============================
   MENU BUILDERS
================================= */

function mainMenu() {
  let text = "🌾 Kisan Mitra\n\nSelect a scheme:\n";
  let i = 1;
  for (let key in schemes) {
    text += `${i}. ${schemes[key].name}\n`;
    i++;
  }
  text += "\nReply with number:";
  return text;
}

function schemeMenu(schemeKey) {
  return `${schemes[schemeKey].name}

1. Overview
2. Eligibility
3. Documents
4. Benefits
5. How to Apply

Reply with number:`;
}

function getSchemeResponse(schemeKey, option) {
  const scheme = schemes[schemeKey];

  switch (option) {
    case "1":
      return scheme.overview;
    case "2":
      return scheme.eligibility;
    case "3":
      return scheme.documents;
    case "4":
      return scheme.benefits;
    case "5":
      return scheme.apply;
    default:
      return "Invalid option. Reply with 1-5.";
  }
}

/* ===============================
   HEALTH CHECK ROUTE
================================= */

app.get("/", (req, res) => {
  res.send("✅ Kisan Mitra SMS Bot is running");
});

/* ===============================
   SMS WEBHOOK
================================= */

app.post("/sms", (req, res) => {
  const twiml = new MessagingResponse();
  const msg = req.body.Body ? req.body.Body.trim() : "";
  const from = req.body.From;

  if (!from) {
    return res.status(400).send("Invalid request");
  }

  if (!users[from]) {
    users[from] = { stage: "main", scheme: null };
  }

  const user = users[from];

  // START COMMAND
  if (msg.toLowerCase() === "hi" || msg.toLowerCase() === "start") {
    user.stage = "main";
    user.scheme = null;
    twiml.message(mainMenu());
  }

  // MAIN MENU
  else if (user.stage === "main") {
    const index = parseInt(msg) - 1;
    const keys = Object.keys(schemes);

    if (!isNaN(index) && keys[index]) {
      user.scheme = keys[index];
      user.stage = "scheme";
      twiml.message(schemeMenu(user.scheme));
    } else {
      twiml.message("Invalid option.\n\n" + mainMenu());
    }
  }

  // SCHEME MENU
  else if (user.stage === "scheme") {

    if (msg === "0") {
      user.stage = "main";
      user.scheme = null;
      twiml.message(mainMenu());
    } else {
      const response = getSchemeResponse(user.scheme, msg);
      twiml.message(response + "\n\nReply 0 for main menu.");
    }
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

/* ===============================
   RENDER PORT CONFIG
================================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});