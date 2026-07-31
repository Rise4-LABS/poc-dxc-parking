// mail.js — envoi via noreplyrise@rise.fo (Microsoft Graph).
// Nécessite l'env group Render "noreplyrise-mail" (voir render.yaml) :
// MAIL_TENANT_ID, MAIL_CLIENT_ID, MAIL_CLIENT_SECRET, MAIL_SENDER.
let cached = { token: null, exp: 0 };

async function getToken() {
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token;
  const res = await fetch(`https://login.microsoftonline.com/${process.env.MAIL_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MAIL_CLIENT_ID,
      client_secret: process.env.MAIL_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Token Graph: ${res.status} ${await res.text()}`);
  const data = await res.json();
  cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

async function sendMail({ to, subject, html }) {
  const recipients = (Array.isArray(to) ? to : [to]).map((a) => ({ emailAddress: { address: a } }));
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${process.env.MAIL_SENDER}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { subject, body: { contentType: "HTML", content: html }, toRecipients: recipients },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) throw new Error(`sendMail: ${res.status} ${await res.text()}`);
}

module.exports = { sendMail };
