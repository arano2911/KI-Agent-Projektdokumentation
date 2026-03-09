import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// .env.local laden
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
}

const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
const apiToken = env.WHATSAPP_API_TOKEN;
// Leerzeichen aus Telefonnummer entfernen
const testNumber = (env.WHATSAPP_TEST_NUMBER || "").replace(/\s/g, "");

if (!phoneNumberId || !apiToken || !testNumber) {
  console.error(
    "Fehler: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_TOKEN und WHATSAPP_TEST_NUMBER müssen in .env.local gesetzt sein."
  );
  process.exit(1);
}

const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

const body = {
  messaging_product: "whatsapp",
  to: testNumber,
  type: "text",
  text: { body: "Hallo von Misty!" },
};

console.log(`Sende Nachricht an ${testNumber}...`);

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const data = await res.json();
console.log("Status:", res.status);
console.log("Antwort von Meta:", JSON.stringify(data, null, 2));
