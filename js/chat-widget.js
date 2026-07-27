/**
 * Prosty widget czatu AI — bez zależności, jeden plik.
 * Dodany na każdej podstronie tuż przed </body>:
 *   <script src="../js/chat-widget.js" defer></script>
 *
 * Widget rozmawia z /api/chat (Claude) i automatycznie wyłapuje ukryty
 * znacznik <!--LEAD:{...}--> w odpowiedzi, wysyłając zebrane dane do /api/lead.
 */
(function () {
  const COLORS = {
    primary: "#1F3864",
    primaryDark: "#16294a",
    bg: "#ffffff",
    bubbleBot: "#f2f2f2",
    bubbleUser: "#1F3864",
  };

  const state = {
    open: false,
    messages: [], // { role: 'user' | 'assistant', content: string }
    loading: false,
  };

  // ---------- Style ----------
  const style = document.createElement("style");
  style.textContent = `
    #ai-chat-launcher {
      position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
      border-radius: 50%; background: ${COLORS.primary}; color: #fff; border: none;
      cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.25); z-index: 999999;
      display: flex; align-items: center; justify-content: center; font-size: 24px;
      transition: transform .15s ease;
    }
    #ai-chat-launcher:hover { transform: scale(1.06); }
    #ai-chat-panel {
      position: fixed; bottom: 92px; right: 24px; width: 340px; max-width: calc(100vw - 32px);
      height: 460px; max-height: calc(100vh - 140px); background: ${COLORS.bg};
      border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,.25); z-index: 999999;
      display: none; flex-direction: column; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #ai-chat-panel.open { display: flex; }
    #ai-chat-header {
      background: ${COLORS.primary}; color: #fff; padding: 14px 16px; font-weight: 600; font-size: 15px;
      display: flex; justify-content: space-between; align-items: center;
    }
    #ai-chat-header button { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; }
    #ai-chat-messages { flex: 1; overflow-y: auto; padding: 14px; background: #fafafa; }
    .ai-msg { max-width: 82%; margin-bottom: 10px; padding: 9px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.4; white-space: pre-wrap; }
    .ai-msg.user { background: ${COLORS.bubbleUser}; color: #fff; margin-left: auto; border-bottom-right-radius: 3px; }
    .ai-msg.assistant { background: ${COLORS.bubbleBot}; color: #222; margin-right: auto; border-bottom-left-radius: 3px; }
    .ai-msg.typing { font-style: italic; color: #888; background: transparent; padding: 0 4px; }
    #ai-chat-inputbar { display: flex; border-top: 1px solid #eee; padding: 8px; gap: 6px; }
    #ai-chat-input {
      flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: 13.5px; outline: none;
    }
    #ai-chat-send {
      background: ${COLORS.primary}; color: #fff; border: none; border-radius: 20px; padding: 0 16px; cursor: pointer; font-size: 13px;
    }
    #ai-chat-send:disabled { opacity: .5; cursor: default; }
  `;
  document.head.appendChild(style);

  // ---------- DOM ----------
  const launcher = document.createElement("button");
  launcher.id = "ai-chat-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML = "💬";

  const panel = document.createElement("div");
  panel.id = "ai-chat-panel";
  panel.innerHTML = `
    <div id="ai-chat-header">
      <span>Chat with us</span>
      <button id="ai-chat-close" aria-label="Close">✕</button>
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
