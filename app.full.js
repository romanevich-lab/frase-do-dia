// Frase do Dia — no backend yet.
// Data: phrases.json (300 phrases) with {id, pt, en, focus}
//
// You can change START_DATE to the day you "start" the rotation.
const START_DATE = "2026-03-04"; // YYYY-MM-DD
const HISTORY_DAYS = 90; // how many past days to show in the left sidebar
const TIME_ZONE = "Europe/Lisbon";

const els = {
  todayLabel: document.getElementById("todayLabel"),
  historyList: document.getElementById("historyList"),
  searchInput: document.getElementById("searchInput"),

  phrasePt: document.getElementById("phrasePt"),
  phraseEn: document.getElementById("phraseEn"),
  focusChip: document.getElementById("focusChip"),
  counterLabel: document.getElementById("counterLabel"),

  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  copyBtn: document.getElementById("copyBtn"),
  toggleTranslationBtn: document.getElementById("toggleTranslationBtn"),

  clozeText: document.getElementById("clozeText"),
  answerInput: document.getElementById("answerInput"),
  checkBtn: document.getElementById("checkBtn"),
  feedback: document.getElementById("feedback"),
};

function ymdInTZ(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = fmt.formatToParts(date);
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return { y: Number(y), m: Number(m), d: Number(d), str: `${y}-${m}-${d}` };
}

function parseYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function daysBetweenUTC(aYMD, bYMD) {
  // both are {y,m,d} -> treat as UTC midnights
  const a = Date.UTC(aYMD.y, aYMD.m - 1, aYMD.d);
  const b = Date.UTC(bYMD.y, bYMD.m - 1, bYMD.d);
  return Math.floor((b - a) / 86400000);
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPrettyDate(ymd) {
  // Portuguese label
  const [y,m,d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m-1, d));
  const fmt = new Intl.DateTimeFormat("pt-PT", { timeZone: TIME_ZONE, weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  return fmt.format(date);
}

function replaceFocusWithBlank(pt, focus) {
  // Replace the first occurrence (case-insensitive)
  const re = new RegExp(focus.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (!re.test(pt)) return pt;
  return pt.replace(re, "_____");
}

function savePref(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}
function loadPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

let PHRASES = [];
let todayOffset = 0; // days from START_DATE to today
let currentOffset = 0; // which day user is viewing

function phraseIndexForOffset(offset) {
  // offset can be negative/positive; wrap around
  const n = PHRASES.length;
  const idx = ((offset % n) + n) % n;
  return idx;
}

function getPhraseForOffset(offset) {
  const idx = phraseIndexForOffset(offset);
  return PHRASES[idx];
}

function renderHistory() {
  els.historyList.innerHTML = "";
  const start = Math.max(0, todayOffset - HISTORY_DAYS);
  for (let off = todayOffset; off >= start; off--) {
    const dateStr = offsetToDateStr(off);
    const p = getPhraseForOffset(off);
    const el = document.createElement("div");
    el.className = "item" + (off === currentOffset ? " active" : "");
    el.dataset.offset = String(off);

    const dateEl = document.createElement("div");
    dateEl.className = "item-date";
    dateEl.textContent = formatPrettyDate(dateStr);

    const ptEl = document.createElement("div");
    ptEl.className = "item-pt";
    ptEl.textContent = p.pt;

    el.appendChild(dateEl);
    el.appendChild(ptEl);
    el.addEventListener("click", () => {
      currentOffset = off;
      savePref("fd_currentOffset", currentOffset);
      renderAll();
    });

    els.historyList.appendChild(el);
  }
}

function offsetToDateStr(offset) {
  const start = parseYMD(START_DATE);
  const t = Date.UTC(start.y, start.m - 1, start.d) + offset * 86400000;
  const dt = new Date(t);
  // get the YMD in Lisbon for this UTC instant
  const parts = ymdInTZ(dt);
  return parts.str;
}

function renderPhrase() {
  const dateStr = offsetToDateStr(currentOffset);
  const p = getPhraseForOffset(currentOffset);

  els.todayLabel.textContent = (currentOffset === todayOffset) ? "Hoje" : formatPrettyDate(dateStr);
  els.phrasePt.textContent = p.pt;
  els.phraseEn.textContent = p.en;
  els.focusChip.textContent = "Foco: " + p.focus;

  els.counterLabel.textContent = `#${p.id} / ${PHRASES.length}`;

  // Translation toggle
  const showTranslation = loadPref("fd_showTranslation", false);
  els.phraseEn.hidden = !showTranslation;
  els.toggleTranslationBtn.textContent = showTranslation ? "Esconder tradução" : "Mostrar tradução";

  // Mini-test (cloze)
  els.clozeText.textContent = replaceFocusWithBlank(p.pt, p.focus);
  els.answerInput.value = "";
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
}

function renderAll() {
  renderPhrase();
  renderHistory();
  applySearchFilter();
}

function applySearchFilter() {
  const q = normalizeText(els.searchInput.value);
  const items = els.historyList.querySelectorAll(".item");
  items.forEach(it => {
    const off = Number(it.dataset.offset || "0");
    const p = getPhraseForOffset(off);
    const hay = normalizeText(p.pt + " " + offsetToDateStr(off));
    it.style.display = (q && !hay.includes(q)) ? "none" : "";
  });
}

function moveDay(delta) {
  currentOffset = clamp(currentOffset + delta, 0, todayOffset);
  savePref("fd_currentOffset", currentOffset);
  renderAll();
}

function copyPhrase() {
  const text = els.phrasePt.textContent || "";
  navigator.clipboard?.writeText(text).then(() => {
    els.copyBtn.textContent = "Copiado!";
    setTimeout(() => (els.copyBtn.textContent = "Copiar"), 900);
  }).catch(() => {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  });
}

function toggleTranslation() {
  const cur = loadPref("fd_showTranslation", false);
  savePref("fd_showTranslation", !cur);
  renderPhrase();
}

function checkAnswer() {
  const p = getPhraseForOffset(currentOffset);
  const expected = normalizeText(p.focus);
  const got = normalizeText(els.answerInput.value);

  if (!got) {
    els.feedback.textContent = "Escreve uma resposta primeiro.";
    els.feedback.className = "feedback bad";
    return;
  }

  if (got === expected) {
    els.feedback.textContent = "✅ Certo!";
    els.feedback.className = "feedback good";
    // store a tiny stat (useful later for spaced repetition)
    const stats = loadPref("fd_stats", {});
    const key = String(p.id);
    const cur = stats[key] || { ok: 0, tries: 0 };
    cur.ok += 1; cur.tries += 1;
    stats[key] = cur;
    savePref("fd_stats", stats);
  } else {
    els.feedback.textContent = `❌ Quase. Resposta: “${p.focus}”`;
    els.feedback.className = "feedback bad";
    const stats = loadPref("fd_stats", {});
    const key = String(p.id);
    const cur = stats[key] || { ok: 0, tries: 0 };
    cur.tries += 1;
    stats[key] = cur;
    savePref("fd_stats", stats);
  }
}

async function init() {
  const res = await fetch("phrases.json", { cache: "no-store" });
  PHRASES = await res.json();

  // compute today offset (Lisbon date)
  const start = parseYMD(START_DATE);
  const today = ymdInTZ(new Date());
  todayOffset = Math.max(0, daysBetweenUTC(start, today));

  // restore last viewed day (or default to today)
  currentOffset = loadPref("fd_currentOffset", todayOffset);
  currentOffset = clamp(currentOffset, 0, todayOffset);

  // wire events
  els.prevBtn.addEventListener("click", () => moveDay(-1));
  els.nextBtn.addEventListener("click", () => moveDay(1));
  els.copyBtn.addEventListener("click", copyPhrase);
  els.toggleTranslationBtn.addEventListener("click", toggleTranslation);

  els.searchInput.addEventListener("input", applySearchFilter);

  els.checkBtn.addEventListener("click", checkAnswer);
  els.answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkAnswer();
  });

  renderAll();
}

init().catch(err => {
  console.error(err);
  els.phrasePt.textContent = "Erro ao carregar phrases.json";
});
