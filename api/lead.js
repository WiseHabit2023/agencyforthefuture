// Vercel Serverless Function — POST /api/lead
// Odbiera dane leada zebrane przez bota i przekazuje je dalej dwoma kanałami:
// 1) Formspree — ten sam formularz co istniejący formularz kontaktowy na stronie (ID: mnjyvvgb),
//    więc lead od razu przychodzi mailem na office@wisehabit.com, bez żadnej dodatkowej konfiguracji.
// 2) Opcjonalnie: webhook wejściowy w Clay — gdy będzie gotowy, wpiszcie jego URL jako zmienną
//    środowiskową LEAD_WEBHOOK_URL, a lead zacznie lądować też bezpośrednio w tabeli w Clay.
// Do podglądu "na sucho" zawsze zostaje log w Vercel -> Project -> Logs (szuka "New lead").

const FORMSPREE_URL = "https://formspree.io/f/mnjyvvgb";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const lead = req.body || {};
  console.log("New lead from website chatbot:", JSON.stringify(lead));

  try {
    await fetch(FORMSPREE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        name: lead.name,
        email: lead.email,
        company: lead.company,
        subject: `Chatbot lead: ${lead.segment || "unspecified"}, ${lead.company || lead.name || ""}`,
        message: `New lead from the website chatbot.\n\nSegment: ${lead.segment || "n/a"}\nName: ${lead.name || "n/a"}\nEmail: ${lead.email || "n/a"}\nCompany: ${lead.company || "n/a"}\nNotes: ${lead.notes || "n/a"}`,
      }),
    });
  } catch (err) {
    console.error("Failed to forward lead to Formspree:", err);
  }

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
