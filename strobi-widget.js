
(() => {
  if (document.getElementById("strobi-guide")) return;

  const style = document.createElement("style");
  style.textContent = `
    #strobi-guide {
      position: fixed;
      right: 18px;
      bottom: 20px;
      z-index: 99999;
      font-family: system-ui, sans-serif;
      color: #fff;
    }
    #strobi-guide * { box-sizing: border-box; }
    #strobi-mascot {
      width: 66px;
      height: 66px;
      border: 3px solid #a9c4ff;
      border-radius: 50%;
      background: radial-gradient(circle at 32% 25%, #a7bcff, #5b7fe5 55%, #293b99);
      box-shadow: 0 0 24px #5b7fe588;
      cursor: pointer;
      display: grid;
      place-items: center;
      position: relative;
      animation: strobi-float 3s ease-in-out infinite;
    }
    #strobi-mascot .eyes {
      display: flex;
      gap: 13px;
      transform: translateY(-3px);
    }
    #strobi-mascot .eye {
      width: 8px;
      height: 13px;
      background: #111827;
      border-radius: 50%;
    }
    #strobi-mascot .mouth {
      position: absolute;
      width: 15px;
      height: 7px;
      border-bottom: 2px solid #111827;
      border-radius: 50%;
      top: 39px;
    }
    #strobi-bubble {
      width: min(285px, calc(100vw - 36px));
      margin-bottom: 12px;
      padding: 16px;
      border: 1px solid #596ba8;
      border-radius: 17px;
      background: #14182af5;
      box-shadow: 0 10px 35px #0006;
      line-height: 1.5;
    }
    #strobi-bubble[hidden] { display: none; }
    #strobi-message { font-size: 14px; margin: 0 0 12px; }
    #strobi-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    #strobi-actions button, #strobi-hide {
      border: 0;
      border-radius: 9px;
      padding: 9px 12px;
      font-size: 13px;
      cursor: pointer;
    }
    #strobi-show { background: #7895ff; color: #10152c; }
    #strobi-later, #strobi-hide { background: #30364d; color: white; }
    #strobi-hide { margin-top: 8px; }
    @keyframes strobi-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @media (prefers-reduced-motion: reduce) {
      #strobi-mascot { animation: none; }
    }
  `;
  document.head.appendChild(style);

  const guide = document.createElement("div");
  guide.id = "strobi-guide";
  guide.innerHTML = `
    <div id="strobi-bubble" hidden role="status" aria-live="polite">
      <p id="strobi-message"></p>
      <div id="strobi-actions">
        <button id="strobi-show">Show me</button>
        <button id="strobi-later">Not now</button>
      </div>
    </div>
    <button id="strobi-mascot" aria-label="Ask Strobi for a hint"
      title="Tap to explore">
      <span class="eyes"><span class="eye"></span><span class="eye"></span></span>
      <span class="mouth"></span>
    </button>
    <button id="strobi-hide">Hide guide</button>
  `;
  document.body.appendChild(guide);

  const bubble = guide.querySelector("#strobi-bubble");
  const message = guide.querySelector("#strobi-message");
  const mascot = guide.querySelector("#strobi-mascot");
  const showButton = guide.querySelector("#strobi-show");
  const laterButton = guide.querySelector("#strobi-later");
  const hideButton = guide.querySelector("#strobi-hide");

  const cues = [
    {
      ids: ["home", "hero", "top"],
      text: "Hey! I'm Cat. Want me to show you around?",
      target: "features"
    },
    {
      ids: ["features", "services"],
      text: "Here are the main features. Want to explore them?",
      target: "how-it-works"
    },
    {
      ids: ["how-it-works", "how"],
      text: "Here's how it works. Let's take a look at the next step.",
      target: "get-started"
    },
    {
      ids: ["faq", "questions"],
      text: "Got questions? You might find the answer in this section.",
      target: "get-started"
    },
    {
      ids: ["get-started", "contact"],
      text: "You've reached the next step! Explore whenever you're ready.",
      target: "home"
    }
  ];

  let currentCue = cues[0];
  let manuallyHidden = false;
  let inactivityTimer;
  let seen = new Set();

  function findCue() {
    for (const cue of cues) {
      if (cue.ids.some(id => document.getElementById(id))) {
        const visibleTarget = cue.ids
          .map(id => document.getElementById(id))
          .find(el => el && el.getBoundingClientRect().top < innerHeight * 0.7
            && el.getBoundingClientRect().bottom > 0);
        if (visibleTarget) return cue;
      }
    }
    return cues[0];
  }

  function openBubble(cue) {
    if (manuallyHidden) return;
    currentCue = cue || findCue();
    message.textContent = currentCue.text;
    bubble.hidden = false;
    seen.add(currentCue.ids[0]);
  }

  function closeBubble() {
    bubble.hidden = true;
  }

  function resetInactivity() {
    clearTimeout(inactivityTimer);
    if (manuallyHidden) return;
    inactivityTimer = setTimeout(() => {
      closeBubble();
    }, 25000);
  }

  mascot.addEventListener("click", () => {
    if (bubble.hidden) openBubble(findCue());
    else closeBubble();
    resetInactivity();
  });

  laterButton.addEventListener("click", () => {
    closeBubble();
    resetInactivity();
  });

  showButton.addEventListener("click", () => {
    const target = document.getElementById(currentCue.target);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      closeBubble();
      message.textContent = "Scroll down to explore the next section!";
      bubble.hidden = false;
    }
    resetInactivity();
  });

  hideButton.addEventListener("click", () => {
    manuallyHidden = true;
    closeBubble();
    mascot.hidden = true;
    hideButton.textContent = "Show Strobi";
  });

  hideButton.addEventListener("click", () => {
    if (mascot.hidden) {
      mascot.hidden = false;
      manuallyHidden = false;
      hideButton.textContent = "Hide guide";
      openBubble(findCue());
      resetInactivity();
    }
  });

  let scrollTimer;
  window.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const cue = findCue();
      if (!seen.has(cue.ids[0]) && !manuallyHidden) {
        openBubble(cue);
      }
    }, 700);
    resetInactivity();
  }, { passive: true });

  ["pointerdown", "keydown", "touchstart"].forEach(event => {
    document.addEventListener(event, resetInactivity, { passive: true });
  });

  setTimeout(() => {
    if (!manuallyHidden && !seen.has("home")) {
      openBubble(cues[0]);
    }
  }, 1800);

  resetInactivity();
})();
