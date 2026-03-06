const TIME_ZONE = "Europe/Lisbon";
const START_DATE = "2026-03-04";

const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches;
const GHOST_COUNT = IS_MOBILE ? 7 : 12;

let PHRASES = [];
let currentIndex = 0;

function lisbonDayNumber() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find(p => p.type === "year").value);
  const m = Number(parts.find(p => p.type === "month").value);
  const d = Number(parts.find(p => p.type === "day").value);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function startDayNumber() {
  const [y, m, d] = START_DATE.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function enableCloud(on) {
  const c = document.getElementById("cloud");
  if (!c) return;
  c.classList.toggle("on", !!on);
  if (!on) c.innerHTML = "";
}

function renderIndex(i) {
  if (!PHRASES.length) return;
  currentIndex = ((i % PHRASES.length) + PHRASES.length) % PHRASES.length;
  const p = PHRASES[currentIndex];
  document.getElementById("pt").textContent = p.pt || "";
  document.getElementById("en").textContent = p.en || "";
  if (document.getElementById("cloud")?.classList.contains("on")) {
    buildGhostCloud(PHRASES, currentIndex);
  }
}

function rectsOverlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

function getQuietRect() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // approximate center of your text block (since we shift it up a bit on mobile)
  const cx = w * 0.50;
  const cy = h * (IS_MOBILE ? 0.47 : 0.45);

  const qw = w * (IS_MOBILE ? 0.92 : 0.72);
  const qh = h * (IS_MOBILE ? 0.36 : 0.28);

  return {
    left: cx - qw / 2, right: cx + qw / 2,
    top: cy - qh / 2, bottom: cy + qh / 2,
  };
}

function buildGhostCloud(phrases, centerIdx) {
  const cloud = document.getElementById("cloud");
  if (!cloud) return;
  cloud.innerHTML = "";

  const quiet = getQuietRect();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const placed = [];

  // Mobile: fixed “edge spots” so it never becomes messy.
  const edgeSpotsMobile = [
    { x01: 0.08, y01: 0.18 }, { x01: 0.92, y01: 0.18 },
    { x01: 0.08, y01: 0.34 }, { x01: 0.92, y01: 0.34 },
    { x01: 0.08, y01: 0.68 }, { x01: 0.92, y01: 0.68 },
    { x01: 0.08, y01: 0.82 }, { x01: 0.92, y01: 0.82 },
    { x01: 0.50, y01: 0.12 }, { x01: 0.50, y01: 0.88 },
  ];

  for (let k = 1; k <= GHOST_COUNT; k++) {
    const idx = (centerIdx - k + phrases.length) % phrases.length;
    const pt = phrases[idx].pt || "";

    const el = document.createElement("div");
    el.className = "ghost " + (k > 5 ? "tiny" : k > 2 ? "small" : "");
    el.textContent = pt;
    el.style.opacity = "0";
    cloud.appendChild(el);

    let ok = false;

    for (let tries = 0; tries < 80; tries++) {
      let x01, y01;

      if (IS_MOBILE) {
        const s = edgeSpotsMobile[(k - 1 + tries) % edgeSpotsMobile.length];
        x01 = s.x01 + (Math.random() * 0.02 - 0.01); // tiny jitter
        y01 = s.y01 + (Math.random() * 0.02 - 0.01);
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = 0.30 + Math.random() * 0.25;
        x01 = 0.5 + Math.cos(a) * r;
        y01 = 0.5 + Math.sin(a) * r * 0.75;
      }

      x01 = Math.min(0.94, Math.max(0.06, x01));
      y01 = Math.min(0.92, Math.max(0.08, y01));

      el.style.left = (x01 * 100).toFixed(2) + "%";
      el.style.top  = (y01 * 100).toFixed(2) + "%";

      const r = el.getBoundingClientRect();

      if (rectsOverlap(r, quiet)) continue;
      if (r.left < 8 || r.right > w - 8 || r.top < 8 || r.bottom > h - 8) continue;

      let overlap = false;
      for (const pr of placed) { if (rectsOverlap(r, pr)) { overlap = true; break; } }
      if (overlap) continue;

      placed.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      ok = true;
      break;
    }

    if (!ok) {
      el.style.left = "8%";
      el.style.top = (k * 10) + "%";
    }

    // gentle drift (desktop mostly; on mobile keep it minimal)
    const dx = (IS_MOBILE ? (Math.random()*8-4) : (Math.random()*18-9)).toFixed(1);
    const dy = (IS_MOBILE ? (Math.random()*6-3) : (Math.random()*14-7)).toFixed(1);
    const dur = (IS_MOBILE ? (22 + Math.random()*10) : (18 + Math.random()*16)).toFixed(1);

    if (el.animate) {
      el.animate(
        [
          { transform: `translate(0px,0px)` },
          { transform: `translate(${dx}px,${dy}px)` },
          { transform: `translate(0px,0px)` },
        ],
        { duration: dur * 1000, iterations: Infinity, easing: "ease-in-out" }
      );
    }

    el.style.opacity = "1";

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      renderIndex(idx);
    });
  }
}

/* Auth UI */
function showUser(u) {
  document.getElementById("signin").style.display = "none";
  const user = document.getElementById("user");
  user.style.display = "flex";
  document.getElementById("name").textContent = u.name || u.email || "User";
  document.getElementById("avatar").src = u.picture || "";
  enableCloud(true);
  if (PHRASES.length) buildGhostCloud(PHRASES, currentIndex);
}

function showSignin() {
  document.getElementById("user").style.display = "none";
  document.getElementById("signin").style.display = "block";
  enableCloud(false);
}

async function refreshMe() {
  const r = await fetch("/api/me", { cache: "no-store" });
  if (!r.ok) return showSignin();
  const u = await r.json();
  showUser(u);
}

window.handleCredentialResponse = async (resp) => {
  const r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: resp.credential }),
  });
  if (!r.ok) return showSignin();
  await refreshMe();
};

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  showSignin();
});

window.addEventListener("resize", () => {
  if (document.getElementById("cloud")?.classList.contains("on") && PHRASES.length) {
    buildGhostCloud(PHRASES, currentIndex);
  }
});

/* Boot */
(async () => {
  const res = await fetch("phrases.json", { cache: "no-store" });
  PHRASES = await res.json();

  const idx = ((lisbonDayNumber() - startDayNumber()) % PHRASES.length + PHRASES.length) % PHRASES.length;
  renderIndex(idx);

  refreshMe();
})().catch(e => {
  document.getElementById("pt").textContent = "Erro ao carregar frases.";
  document.getElementById("en").textContent = String(e);
});