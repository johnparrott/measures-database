(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") !== "1") return;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const norm = s => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  const style = document.createElement("style");
  style.id = "autoplay-demo-style";
  style.textContent = `
    html.autoplay-demo,
    html.autoplay-demo body,
    html.autoplay-demo body * { cursor: none !important; }

    #autoplay-demo-cursor {
      position: fixed;
      z-index: 2147483647;
      left: 0; top: 0;
      width: 28px; height: 34px;
      pointer-events: none;
      opacity: 0;
      transform: translate3d(-60px,-60px,0);
      transition: transform .72s cubic-bezier(.22,.82,.24,1), opacity .18s ease;
      filter: drop-shadow(0 1px 1px rgba(0,0,0,.18));
      will-change: transform;
    }
    #autoplay-demo-cursor.on { opacity: 1; }

    #autoplay-demo-click {
      position: fixed;
      z-index: 2147483646;
      width: 26px; height: 26px;
      margin: -13px 0 0 -13px;
      border: 1.5px solid rgba(0,0,0,.34);
      border-radius: 999px;
      pointer-events: none;
      opacity: 0;
      transform: scale(.45);
    }
    #autoplay-demo-click.go { animation: autoplayDemoClick .42s ease-out forwards; }

    @keyframes autoplayDemoClick {
      from { opacity: .65; transform: scale(.45); }
      to   { opacity: 0; transform: scale(1.7); }
    }

    #autoplay-demo-fade {
      position: fixed;
      z-index: 2147483645;
      inset: 0;
      background: #fff;
      opacity: 0;
      pointer-events: none;
      transition: opacity .3s ease;
    }
    #autoplay-demo-fade.on { opacity: 1; }
  `;
  document.head.appendChild(style);
  document.documentElement.classList.add("autoplay-demo");

  const cursor = document.createElement("div");
  cursor.id = "autoplay-demo-cursor";
  cursor.innerHTML = `
    <svg viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.2 2.2 22.1 19.1l-8.65 1.5 5.05 9.35-4.15 2.25-5.05-9.35-6.35 6.05Z"
        fill="#fff" stroke="#000" stroke-width="1.65" stroke-linejoin="round"/>
    </svg>`;
  document.body.appendChild(cursor);

  const ring = document.createElement("div");
  ring.id = "autoplay-demo-click";
  document.body.appendChild(ring);

  const fade = document.createElement("div");
  fade.id = "autoplay-demo-fade";
  document.body.appendChild(fade);

  function pointFor(el) {
    const r = el.getBoundingClientRect();
    return {
      x: r.left + Math.min(Math.max(r.width * .52, 10), Math.max(r.width - 10, 10)),
      y: r.top + Math.min(Math.max(r.height * .52, 10), Math.max(r.height - 10, 10))
    };
  }

  async function moveTo(el, ms = 720) {
    if (!el) return false;
    const p = pointFor(el);
    cursor.style.transitionDuration = `${ms}ms`;
    cursor.classList.add("on");
    cursor.style.transform = `translate3d(${p.x - 4}px,${p.y - 3}px,0)`;
    await sleep(ms + 70);
    return true;
  }

  function pulse(el) {
    const p = pointFor(el);
    ring.style.left = `${p.x}px`;
    ring.style.top = `${p.y}px`;
    ring.classList.remove("go");
    void ring.offsetWidth;
    ring.classList.add("go");
  }

  async function click(el, pause = 520) {
    if (!el) return false;
    await moveTo(el);
    pulse(el);
    el.click();
    await sleep(pause);
    return true;
  }

  function byText(selector, text, root = document) {
    const wanted = Array.isArray(text) ? text.map(norm) : [norm(text)];
    return [...root.querySelectorAll(selector)].find(el => {
      const value = norm(el.textContent);
      return wanted.some(w => value === w || value.includes(w));
    }) || null;
  }

  function facetSection(title) {
    const wanted = norm(title);
    return [...document.querySelectorAll(".facet-section")].find(section => {
      const heading = section.querySelector(".facet-title");
      return heading && norm(heading.textContent).includes(wanted);
    }) || null;
  }

  function chip(sectionTitle, labels) {
    const section = facetSection(sectionTitle);
    if (!section) return null;
    const choices = [...section.querySelectorAll(".facet-chip,.age-chip")]
      .filter(el => !el.disabled && norm(el.textContent) !== "any");

    for (const label of labels) {
      const wanted = norm(label);
      const exact = choices.find(el => norm(el.textContent) === wanted);
      if (exact) return exact;
      const contains = choices.find(el => norm(el.textContent).includes(wanted));
      if (contains) return contains;
    }
    return choices[0] || null;
  }

  async function typeHuman(input, text) {
    await moveTo(input, 760);
    input.focus();
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(350);

    for (const char of text) {
      input.value += char;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(125 + Math.random() * 80);
    }
    await sleep(850);
  }

  async function enter(input) {
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter", code: "Enter", keyCode: 13, which: 13,
      bubbles: true, cancelable: true
    }));
    await sleep(900);
  }

  function findCorrection() {
    return (
      document.querySelector(".search-summary .did-you-mean-inline button") ||
      byText(".search-summary button", "meaning") ||
      byText(".suggestion-item", "meaning")
    );
  }

  function findMLQ() {
    return [...document.querySelectorAll(".measure-title-link,.measure-title,a,button")]
      .find(el => {
        const t = norm(el.textContent);
        return t.includes("meaning in life questionnaire") ||
               t.includes("meaning in life question");
      }) || null;
  }

  async function scrollDetail() {
    const detail = document.querySelector(".detail-view");
    if (!detail) return;

    detail.scrollTop = 0;
    await sleep(900);

    const max = Math.max(0, detail.scrollHeight - detail.clientHeight);
    const duration = 9000;
    const start = performance.now();

    await new Promise(resolve => {
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        detail.scrollTop = max * e;
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  async function cursorOffscreen() {
    cursor.style.transitionDuration = "650ms";
    cursor.style.transform =
      `translate3d(${window.innerWidth - 65}px,${window.innerHeight - 70}px,0)`;
    await sleep(700);
    cursor.classList.remove("on");
  }

  async function run() {
    await sleep(1000);

    cursor.classList.add("on");
    cursor.style.transform = "translate3d(68px,110px,0)";
    await sleep(650);

    const filterButton =
      document.getElementById("filterBtn") ||
      byText("button", "filter");
    await click(filterButton, 760);

    const filters = [
      chip("Population", ["Adults", "Adult"]),
      chip("Length", ["Under 15", "Short", "Brief"]),
      chip("Language", ["English"])
    ].filter(Boolean);

    for (const filter of [...new Set(filters)]) {
      await click(filter, 520);
    }

    const apply =
      document.getElementById("applyFilters") ||
      byText(".filter-footer button,button", ["Apply filters", "Apply"]);
    await click(apply, 900);

    const search =
      document.querySelector(".search-input") ||
      document.querySelector('input[type="search"]');
    if (!search) throw new Error("Search input not found.");

    await typeHuman(search, "meanig");
    await enter(search);

    await sleep(450);
    const correction = findCorrection();
    if (correction) await click(correction, 900);

    let mlq = findMLQ();

    if (!mlq) {
      search.focus();
      search.value = "Meaning in life";
      search.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(450);
      await enter(search);
      mlq = findMLQ();
    }

    if (!mlq) throw new Error("Meaning in Life Questionnaire result not found.");

    await click(mlq.closest("a,button,.measure-title-link") || mlq, 1150);

    await cursorOffscreen();
    await scrollDetail();

    await sleep(1300);
    fade.classList.add("on");
    await sleep(360);
    window.location.reload();
  }

  window.addEventListener("load", () => {
    run().catch(err => {
      console.warn("[Measures autoplay demo]", err);
      cursor.classList.remove("on");
    });
  }, { once: true });
})();