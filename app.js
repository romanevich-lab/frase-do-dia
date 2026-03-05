const TIME_ZONE = "Europe/Lisbon";
const START_DATE = "2026-03-04"; // поменяй если нужно
const GHOST_COUNT = 12;

let PHRASES = [];
let currentIndex = 0;

function lisbonDayNumber() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

function buildGhostCloud(phrases, centerIdx) {
  const cloud = document.getElementById("cloud");
  if (!cloud) return;
  cloud.innerHTML = "";

  const spots = [
    { x: 12, y: 18 }, { x: 50, y: 10 }, { x: 82, y: 20 },
    { x: 10, y: 42 }, { x: 86, y: 44 },
    { x: 18, y: 72 }, { x: 52, y: 82 }, { x: 84, y: 76 },
    { x: 30, y: 30 }, { x: 70, y: 32 },
    { x: 28, y: 60 }, { x: 72, y: 62 },
  ];

  for (let k = 1; k <= GHOST_COUNT; k++) {
    const idx = (centerIdx - k + phrases.length) % phrases.length;
    const pt = phrases[idx].pt || "";

    const el = document.createElement("div");
    el.className = "ghost " + (k > 8 ? "tiny" : k > 4 ? "small" : "");
    el.textContent = pt;

    const spot = spots[(k - 1) % spots.length];
    el.style.left = spot.x + "%";
    el.style.top  = spot.y + "%";

    const dx = (Math.random() * 18 - 9).toFixed(1);
    const dy = (Math.random() * 14 - 7).toFixed(1);
    const dur = (18 + Math.random() * 16).toFixed(1);

    el.animate(
      [
        { transform: `translate(0px, 0px)` },
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: `translate(0px, 0px)` },
      ],
      { duration: dur * 1000, iterations: Infinity, easing: "ease-in-out" }
    );

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      renderIndex(idx);
    });

    cloud.appendChild(el);
  }
}

/* --- Auth UI --- */
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

/* --- Boot --- */
(async () => {
  const res = await fetch("phrases.json", { cache: "no-store" });
  PHRASES = await res.json();

  const idx = ((lisbonDayNumber() - startDayNumber()) % PHRASES.length + PHRASES.length) % PHRASES.length;
  renderIndex(idx);

  // only after phrases are loaded, check session
  refreshMe();
})().catch(e => {
  document.getElementById("pt").textContent = "Erro ao carregar frases.";
  document.getElementById("en").textContent = String(e);
});