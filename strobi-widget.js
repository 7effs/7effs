(() => {
  "use strict";

  if (document.getElementById("strobi-widget")) return;

  const style = document.createElement("style");
  style.textContent = `
    #strobi-widget {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 999999;
      font: 14px system-ui;
    }
    #strobi-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 1px solid #7184ad;
      background: #172238;
      color: white;
      font-size: 26px;
      cursor: pointer;
    }
    #strobi-panel {
      display: none;
      width: min(320px, calc(100vw - 36px));
      height: 360px;
      margin-bottom: 12px;
      background: #10151f;
      color: white;
      border: 1px solid #394357;
      border-radius: 16px;
      overflow: hidden;
    }
    #strobi-panel.open {
      display: flex;
      flex-direction: column;
    }
    #strobi-messages {
      flex: 1;
      overflow: auto;
      padding: 12px;
    }
    .strobi-message {
      padding: 10px;
      margin: 7px 0;
      background: #252e3e;
      border-radius: 10px;
      overflow-wrap: anywhere;
    }
    #strobi-form {
      display: flex;
      gap: 6px;
      padding: 9px;
    }
    #strobi-input {
      flex: 1;
      min-width: 0;
      padding: 10px;
    }
  `;
  document.head.appendChild(style);

  const box = document.createElement("div");
  box.id = "strobi-widget";
  box.innerHTML = `
    <div id="strobi-panel">
      <div style="padding:12px">✦ Strobi — Site Guide</div>
      <div id="strobi-messages"></div>
      <form id="strobi-form">
        <input id="strobi-input" required maxlength="2000"
          placeholder="Ask Strobi...">
        <button>Send</button>
      </form>
    </div>
    <button id="strobi-button" aria-label="Open Strobi">✦</button>
  `;

  function start() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", start, { once: true });
      return;
    }
    document.body.appendChild(box);
    run();
  }

  function run() {
    const panel = box.querySelector("#strobi-panel");
    const log = box.querySelector("#strobi-messages");
    const input = box.querySelector("#strobi-input");
    const form = box.querySelector("#strobi-form");
    let busy = false;
    let timer;

    function say(text) {
      const item = document.createElement("div");
      item.className = "strobi-message";
      item.textContent = text;
      log.appendChild(item);
      log.scrollTop = log.scrollHeight;
    }

    function resetIdle() {
      clearTimeout(timer);
      box.style.display = "";
      if (!panel.classList.contains("open")) {
        timer = setTimeout(() => {
          box.style.display = "none";
        }, 30000);
      }
    }

    say("Hi! 👋 I'm Cat. Ask me about this website.");

    box.querySelector("#strobi-button").onclick = () => {
      panel.classList.toggle("open");
      resetIdle();
    };

    form.onsubmit = async event => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || busy) return;

      say("You: " + message);
      input.value = "";
      busy = true;

      try {
        const response = await fetch("/api/strobi-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            page: location.pathname,
            title: document.title
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error();
        say(data.reply || "No answer received.");
      } catch {
        say("Connection failed. Please try again.");
      } finally {
        busy = false;
        resetIdle();
      }
    };

    ["pointerdown", "keydown", "scroll"].forEach(event => {
      document.addEventListener(event, resetIdle, { passive: true });
    });

    resetIdle();
  }

  start();
})();
