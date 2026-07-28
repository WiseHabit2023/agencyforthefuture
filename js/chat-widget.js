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
    border: "#e2ddd5",
    bubbleBot: "#f2efe9",
  };
  const FONT = "'CircularXX', 'Nunito', -apple-system, sans-serif";

  // Ikona WH (img/WH_head.svg) — ta sama, która pojawia się w navbarze jako link do wisehabit.com.
  const WH_ICON = '<svg viewBox="0 0 39 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30.3501 9.48997V0.5C25.006 0.5 20.6052 4.5306 20.0164 9.71724V0.5C14.7507 0.5 10.4014 4.41347 9.71165 9.48997H0.962891V20.5H11.973V10.9031H27.9904V20.5H39.0004V9.48997H30.3501Z" fill="currentColor"/><path d="M17.0502 15.4326C15.904 15.4326 14.9746 16.362 14.9746 17.5085H19.1258C19.1258 16.362 18.1964 15.4326 17.0502 15.4326Z" fill="currentColor"/><path d="M22.9135 15.5664C21.7673 15.5664 20.8379 16.4958 20.8379 17.6423H24.9891C24.9891 16.4958 24.0597 15.5664 22.9135 15.5664Z" fill="currentColor"/></svg>';

  const state = {
    open: false,
    messages: [], // { role: 'user' | 'assistant', content: string }
    loading: false,
  };

  // ---------- Style ----------
  const style = document.createElement("style");
  style.textContent = `
    #ai-chat-launcher {
      position: fixed; bottom: 28px; right: 28px; width: 60px; height: 60px;
      border-radius: 50%; background: ${COLORS.black}; border: none;
      cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,.18); z-index: 999999;
      display: flex; align-items: center; justify-content: center; color: #fff;
      transition: transform .18s ease, box-shadow .18s ease;
    }
    #ai-chat-launcher:hover { transform: scale(1.06); box-shadow: 0 8px 24px rgba(0,0,0,.24); }
    #ai-chat-launcher svg { width: 26px; height: auto; }
    #ai-chat-panel {
      position: fixed; bottom: 100px; right: 28px; width: 400px; max-width: calc(100vw - 40px);
      height: 560px; max-height: calc(100vh - 160px); background: ${COLORS.bg};
      border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,.18); z-index: 999999;
      display: none; flex-direction: column; overflow: hidden;
      font-family: ${FONT};
    }
    #ai-chat-panel.open { display: flex; }
    #ai-chat-header {
      background: ${COLORS.black}; color: #fff; padding: 22px 24px; font-weight: 500; font-size: 15.5px;
      letter-spacing: 0.2px; display: flex; justify-content: space-between; align-items: center;
    }
    #ai-chat-header .ai-chat-header-left { display: flex; align-items: center; gap: 12px; }
    #ai-chat-header .ai-chat-header-left svg { width: 22px; height: auto; color: #fff; }
    #ai-chat-header button {
      background: none; border: none; color: #fff; font-size: 15px; cursor: pointer; line-height: 1;
      padding: 6px; opacity: .75; transition: opacity .15s ease;
    }
    #ai-chat-header button:hover { opacity: 1; }
    #ai-chat-messages { flex: 1; overflow-y: auto; padding: 24px; background: ${COLORS.bg}; }
    .ai-msg { max-width: 86%; margin-bottom: 18px; padding: 13px 17px; border-radius: 14px; font-size: 14.5px; line-height: 1.65; white-space: pre-wrap; }
    .ai-msg.user { background: ${COLORS.black}; color: #fff; margin-left: auto; border-bottom-right-radius: 4px; }
    .ai-msg.assistant { background: #ffffff; color: ${COLORS.black}; margin-right: auto; border: 1px solid ${COLORS.border}; border-bottom-left-radius: 4px; }
    .ai-msg.typing { font-style: italic; color: #999; background: transparent; padding: 0 4px; border: none; margin-bottom: 8px; }
    #ai-chat-inputbar { display: flex; border-top: 1px solid ${COLORS.border}; padding: 16px; gap: 10px; }
    #ai-chat-input {
      flex: 1; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 12px 16px;
      font-size: 14px; font-family: ${FONT}; outline: none; background: #fff; color: ${COLORS.black};
    }
    #ai-chat-input:focus { border-color: ${COLORS.black}; }
    #ai-chat-send {
      background: ${COLORS.black}; color: #fff; border: none; border-radius: 10px;
      padding: 0 22px; cursor: pointer; font-size: 13.5px; font-family: ${FONT}; font-weight: 500;
      transition: background .18s ease;
    }
    #ai-chat-send:hover:not(:disabled) { background: #222; }
    #ai-chat-send:disabled { opacity: .5; cursor: default; }
    @media (max-width: 480px) {
      #ai-chat-panel { bottom: 96px; right: 20px; }
      #ai-chat-launcher { bottom: 20px; right: 20px; }
    }
  `;
  document.head.appendChild(style);

  // ---------- DOM ----------
  const launcher = document.createElement("button");
  launcher.id = "ai-chat-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML = WH_ICON;

  const panel = document.createElement("div");
  panel.id = "ai-chat-panel";
  panel.innerHTML = `
    <div id="ai-chat-header">
      <div class="ai-chat-header-left">${WH_ICON}<span>Wise Habit</span></div>
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
      addMessage("assistant", "Hi! How can we help?");
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
