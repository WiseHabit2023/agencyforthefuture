// Vercel Serverless Function — POST /api/lead
// Odbiera dane leada zebrane przez bota i przekazuje je dalej.
// Na razie: loguje w Vercel Logs. Gdy będziecie mieć webhook wejściowy w Clay,
// wpiszcie jego URL jako zmienną środowiskową LEAD_WEBHOOK_URL — lead zacznie lądować
// bezpośrednio w tabeli w Clay bez żadnych dodatkowych zmian w kodzie.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const lead = req.body || {};
  console.log("New lead from website chatbot:", JSON.stringify(lead));

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...lead,
          source: "website-chatbot",
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("Failed to forward lead to webhook:", err);
    }
  }

  res.status(200).json({ ok: true });
};
