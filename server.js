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
    overview: "Pradhan Mantri Fasal Bima Yojana.\nLow premium crop insurance for farmers.",
    eligibility: "All farmers in notified area.\nLoanee: compulsory\nNon-loanee: voluntary.",
    documents: "Aadhaar\nLand Record\nBank Account\nCrop details",
    benefits: "• 2% Kharif\n• 1.5% Rabi\n• Covers drought, flood, pest\n• Post-harvest coverage",
    apply: "Apply at pmfby.gov.in or nearest bank/CSC."
  },

  PMKSY: {
    name: "PMKSY – Irrigation",
    overview: "Pradhan Mantri Krishi Sinchayee Yojana.\nHar Khet Ko Pani.",
    eligibility: "Farmers with land ownership/possession.",
    documents: "Aadhaar\nLand document\nBank account",
    benefits: "• Drip irrigation subsidy\n• Rainwater harvesting\n• Reduced water usage",
    apply: "Apply at District Agriculture Office."
  },

  SHC: {
    name: "SHC – Soil Health Card",
    overview: "Free soil testing every 2 years.",
    eligibility: "All farmers across India.",
    documents: "Aadhaar\nLand Record",
    benefits: "• Fertilizer recommendations\n• Improves crop yield\n• Reduces cost",
    apply: "Visit nearest Krishi Vigyan Kendra (KVK)."
  },

  ENAM: {
    name: "eNAM – Online Market",
    overview: "National Agriculture Market for online crop selling.",
    eligibility: "Farmers registered at APMC mandi.",
    documents: "Aadhaar\nBank account\nAPMC registration",
    benefits: "• Online bidding\n• Better price discovery\n• Direct bank payment",
    apply: "Register at enam.gov.in."
  },

  KCC: {
    name: "KCC – Kisan Call Centre",
    overview: "Toll-free farmer advisory helpline.",
    eligibility: "All farmers.",
    documents: "No documents required.",
    benefits: "• Free expert advice\n• Pest & crop guidance\n• 22 languages supported",
    apply: "Call 1800-180-1551 (6AM–10PM)."
  },

  PGS: {
    name: "PGS – Organic Certification",
    overview: "Low-cost organic certification system.",
    eligibility: "Farmers practicing organic farming in groups.",
    documents: "Land record\nOrganic farming proof\nAadhaar",
    benefits: "• Affordable certification\n• Access to organic market\n• Peer inspection system",
    apply: "Join local PGS group.\nVisit pgsindia.net."
  },

  PM_DHAN_DHANAY: {
    name: "PM Dhan Dhanay Scheme",
    overview: "District productivity enhancement program (2025–2031).",
    eligibility: "Farmers in 100 low-productivity districts.",
    documents: "Aadhaar\nLand Record\nBank Account",
    benefits: "• ₹24,000 Cr yearly budget\n• Crop diversification\n• Irrigation & credit support",
    apply: "Apply via District Agriculture Office."
  },

  PULSES_MISSION: {
    name: "Atmanirbhar Pulses Mission",
    overview: "Mission to boost Tur, Urad & Masoor production.",
    eligibility: "Farmers growing Tur, Urad, Masoor.",
    documents: "Aadhaar\nLand Record\nCrop details",
    benefits: "• MSP procurement guarantee\n• Seed subsidy\n• ₹11,440 Cr budget",
    apply: "Apply via Agriculture Department."
  },

  COTTON_MISSION: {
    name: "Cotton Productivity Mission",
    overview: "Improve cotton yield & textile value chain.",
    eligibility: "Cotton farmers in Gujarat, Maharashtra, Telangana, Punjab, Haryana, Rajasthan.",
    documents: "Aadhaar\nLand Record\nCotton cultivation proof",
    benefits: "• Technology support\n• Higher yield varieties\n• Market linkage",
    apply: "Apply via State Agriculture Office."
  },

  SEEDS_MISSION: {
    name: "High Yield Seeds Mission",
    overview: "National Mission for improved seed varieties.",
    eligibility: "Farmers growing pulses, oilseeds, vegetables.",
    documents: "Aadhaar\nLand Record\nFarmer registration",
    benefits: "• 15–20% yield increase\n• New seed varieties\n• Subsidized distribution",
    apply: "Apply via Agriculture Office."
  },

  MAKHANA_BOARD: {
    name: "National Makhana Board",
    overview: "Dedicated board for Makhana farmers in Bihar.",
    eligibility: "Makhana farmers in Bihar.",
    documents: "Aadhaar\nBihar residency proof\nCultivation record",
    benefits: "• ₹476 Cr support\n• Market linkage\n• Price stabilization",
    apply: "Apply via Bihar Agriculture Department."
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
