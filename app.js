const TIME_ZONE = "Europe/Lisbon";
const START_DATE = "2026-03-04";
const PREVIOUS_COUNT = 3;

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
  const cloud = document.getElementById("cloud");
  if (!cloud) return;

  cloud.classList.toggle("on", !!on);

  if (!on) {
    cloud.innerHTML = "";
  }
}

function getPreviousItems(centerIdx, count = PREVIOUS_COUNT) {
  if (!PHRASES.length) return [];

  const items = [];
  for (let k = count; k >= 1; k--) {
    const idx = (centerIdx - k + PHRASES.length) % PHRASES.length;
    items.push({
      idx,
      phrase: PHRASES[idx]
    });
  }
  return items;
}

function buildGhostCloud(centerIdx) {
  const cloud = document.getElementById("cloud");
  if (!cloud) return;

  cloud.innerHTML = "";

  const previous = getPreviousItems(centerIdx);

  previous.forEach((item, position) => {
    const level = previous.length - position; // 3, 2, 1
    const el = document.createElement("div");

    el.className = `ghost level-${level}`;
    el.textContent = item.phrase.pt || "";
    el.title = item.phrase.pt || "";

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      renderIndex(item.idx);
    });

    cloud.appendChild(el);
  });
}

function renderIndex(i) {
  if (!PHRASES.length) return;

  currentIndex = ((i % PHRASES.length) + PHRASES.length) % PHRASES.length;
  const phrase = PHRASES[currentIndex];

  document.getElementById("pt").textContent = phrase.pt || "";
  document.getElementById("en").textContent = phrase.en || "";

  if (document.getElementById("cloud")?.classList.contains("on")) {
    buildGhostCloud(currentIndex);
  }
}

/* Auth UI */
function showUser(userData) {
  document.getElementById("signin").style.display = "none";

  const user = document.getElementById("user");
  user.style.display = "flex";

  document.getElementById("name").textContent =
    userData.name || userData.email || "User";

  document.getElementById("avatar").src = userData.picture || "";

  enableCloud(true);

  if (PHRASES.length) {
    buildGhostCloud(currentIndex);
  }
}

function showSignin() {
  document.getElementById("user").style.display = "none";
  document.getElementById("signin").style.display = "block";
  enableCloud(false);
}

async function refreshMe() {
  const response = await fetch("/api/me", { cache: "no-store" });

  if (!response.ok) {
    showSignin();
    return;
  }

  const user = await response.json();
  showUser(user);
}

window.handleCredentialResponse = async (resp) => {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: resp.credential }),
  });

  if (!response.ok) {
    showSignin();
    return;
  }

  await refreshMe();
};

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  showSignin();
});

window.addEventListener("resize", () => {
  if (document.getElementById("cloud")?.classList.contains("on") && PHRASES.length) {
    buildGhostCloud(currentIndex);
  }
});

/* Boot */
(async () => {
  const response = await fetch("phrases.json", { cache: "no-store" });
  PHRASES = await response.json();

  const idx =
    ((lisbonDayNumber() - startDayNumber()) % PHRASES.length + PHRASES.length) %
    PHRASES.length;

  renderIndex(idx);
  refreshMe();
})().catch((e) => {
  document.getElementById("pt").textContent = "Erro ao carregar frases.";
  document.getElementById("en").textContent = String(e);
});