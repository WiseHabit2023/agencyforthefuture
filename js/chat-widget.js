/**
 * Prosty widget czatu AI — bez zależności, jeden plik.
 * Dodany na każdej podstronie tuż przed </body>:
 *   <script src="../js/chat-widget.js" defer></script>
 *
 * Widget rozmawia z /api/chat (Claude) i automatycznie wyłapuje ukryty
 * znacznik <!--LEAD:{...}--> w odpowiedzi, wysyłając zebrane dane do /api/lead.
 */
(function () {
  // Paleta i typografia wzięte wprost z css/styles.css strony (--black, --bg, --border, --font),
  // żeby widget wyglądał jak natywny element strony, nie jak doklejony plugin.
  const COLORS = {
    black: "#000000",
    bg: "#faf7f4",
    border: "#d2d2d2",
    bubbleBot: "#f2efe9",
  };
  const FONT = "'CircularXX', 'Nunito', -apple-system, sans-serif";

  const state = {
    open: false,
    messages: [], // { role: 'user' | 'assistant', content: string }
    loading: false,
  };

  // ---------- Style ----------
  const style = document.createElement("style");
  style.textContent = `
    #ai-chat-launcher {
      position: fixed; bottom: 24px; right: 24px; width: 54px; height: 54px;
      border-radius: 50%; background: ${COLORS.black}; border: 1.5px solid ${COLORS.black};
      cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.2); z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      transition: background .18s ease, transform .15s ease;
    }
    #ai-chat-launcher:hover { background: #222; transform: scale(1.05); }
    #ai-chat-launcher svg { width: 22px; height: 22px; }
    #ai-chat-panel {
      position: fixed; bottom: 90px; right: 24px; width: 350px; max-width: calc(100vw - 32px);
      height: 470px; max-height: calc(100vh - 140px); background: ${COLORS.bg};
      border: 1.5px solid ${COLORS.black}; border-radius: 6px; box-shadow: 0 8px 30px rgba(0,0,0,.2);
      z-index: 999999; display: none; flex-direction: column; overflow: hidden;
      font-family: ${FONT};
    }
    #ai-chat-panel.open { display: flex; }
    #ai-chat-header {
      background: ${COLORS.black}; color: #fff; padding: 14px 16px; font-weight: 500; font-size: 15px;
      letter-spacing: 0.2px; display: flex; justify-content: space-between; align-items: center;
    }
    #ai-chat-header button { background: none; border: none; color: #fff; font-size: 16px; cursor: pointer; line-height: 1; padding: 4px; }
    #ai-chat-messages { flex: 1; overflow-y: auto; padding: 14px; background: ${COLORS.bg}; }
    .ai-msg { max-width: 84%; margin-bottom: 10px; padding: 9px 13px; border-radius: 4px; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; }
    .ai-msg.user { background: ${COLORS.black}; color: #fff; margin-left: auto; }
    .ai-msg.assistant { background: ${COLORS.bubbleBot}; color: ${COLORS.black}; margin-right: auto; border: 1px solid ${COLORS.border}; }
    .ai-msg.typing { font-style: italic; color: #888; background: transparent; padding: 0 4px; border: none; }
    #ai-chat-inputbar { display: flex; border-top: 1.5px solid ${COLORS.black}; padding: 8px; gap: 6px; }
    #ai-chat-input {
      flex: 1; border: 1.5px solid ${COLORS.border}; border-radius: 4px; padding: 8px 12px;
      font-size: 13.5px; font-family: ${FONT}; outline: none; background: #fff; color: ${COLORS.black};
    }
    #ai-chat-input:focus { border-color: ${COLORS.black}; }
    #ai-chat-send {
      background: ${COLORS.black}; color: #fff; border: 1.5px solid ${COLORS.black}; border-radius: 4px;
      padding: 0 16px; cursor: pointer; font-size: 13px; font-family: ${FONT}; font-weight: 500;
      transition: background .18s ease;
    }
    #ai-chat-send:hover:not(:disabled) { background: #222; }
    #ai-chat-send:disabled { opacity: .5; cursor: default; }
  `;
  document.head.appendChild(style);

  // ---------- DOM ----------
  const launcher = document.createElement("button");
  launcher.id = "ai-chat-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6"><path d="M4 5.5h16v11H8.5L4 20.5v-4H4z" stroke-linejoin="round" stroke-linecap="round"/></svg>';

  const panel = document.createElement("div");
  panel.id = "ai-chat-panel";
  panel.innerHTML = `
    <div id="ai-chat-header">
      <span>Chat with us</span>
      <button id="ai-chat-close" aria-label="Close">&#10005;</button>
    </div>
    <div id="ai-chat-messages"></div>
    <div id="ai-chat-inputbar">
      <input id="ai-chat-input" type="text" placeholder="Type a message..." />
      <button id="ai-chat-send">Send</button>
    </div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector("#ai-chat-messages");
  const inputEl = panel.querySelector("#ai-chat-input");
  const sendBtn = panel.querySelector("#ai-chat-send");
  const closeBtn = panel.querySelector("#ai-chat-close");

  function renderMessages() {
    messagesEl.innerHTML = "";
    state.messages.forEach((m) => {
      const div = document.createElement("div");
      div.className = "ai-msg " + m.role;
      div.textContent = m.content;
      messagesEl.appendChild(div);
    });
    if (state.loading) {
      const div = document.createElement("div");
      div.className = "ai-msg typing";
      div.textContent = "Typing...";
      messagesEl.appendChild(div);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, content) {
    state.messages.push({ role, content });
    renderMessages();
  }

  function openPanel() {
    state.open = true;
    panel.classList.add("open");
    if (state.messages.length === 0) {
      addMessage("assistant", "Hi! How can I help — design services, our own products, or China sourcing support?");
    }
    inputEl.focus();
  }

  function closePanel() {
    state.open = false;
    panel.classList.remove("open");
  }

  launcher.addEventListener("click", () => (state.open ? closePanel() : openPanel()));
  closeBtn.addEventListener("click", closePanel);

  // Wyłapuje ukryty blok <!--LEAD:{...}--> w odpowiedzi bota, wysyła do /api/lead
  // i zwraca tekst oczyszczony z tego znacznika (użytkownik go nie widzi).
  function extractLead(text) {
    const match = text.match(/<!--LEAD:([\s\S]*?)-->/);
    if (!match) return { clean: text, lead: null };
    let lead = null;
    try {
      lead = JSON.parse(match[1]);
    } catch (e) {
      console.warn("Could not parse LEAD block:", e);
    }
    const clean = text.replace(match[0], "").trim();
    return { clean, lead };
  }

  async function sendLead(lead) {
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (e) {
      console.warn("Could not send lead:", e);
    }
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || state.loading) return;
    inputEl.value = "";
    addMessage("user", text);

    state.loading = true;
    sendBtn.disabled = true;
    renderMessages();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: state.messages }),
      });
      const data = await res.json();
      state.loading = false;
      sendBtn.disabled = false;

      if (!res.ok) {
        addMessage("assistant", "Sorry, something went wrong. Please try again in a moment.");
        return;
      }

      const { clean, lead } = extractLead(data.reply || "");
      addMessage("assistant", clean || "...");
      if (lead) sendLead(lead);
    } catch (e) {
      state.loading = false;
      sendBtn.disabled = false;
      addMessage("assistant", "Sorry, I couldn't connect. Please try again.");
      console.error(e);
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
