const START_DATE = "2026-03-04";   // можешь поменять
const TIME_ZONE  = "Europe/Lisbon";

function getLisbonYMD() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(new Date());
  return {
    y: Number(parts.find(p=>p.type==="year").value),
    m: Number(parts.find(p=>p.type==="month").value),
    d: Number(parts.find(p=>p.type==="day").value),
  };
}
function dayNum({y,m,d}) { return Math.floor(Date.UTC(y,m-1,d)/86400000); }
function parseYMD(s){ const [y,m,d]=s.split("-").map(Number); return {y,m,d}; }

function formatLisbonLongDate(){
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: TIME_ZONE, weekday:"long", year:"numeric", month:"long", day:"numeric"
  }).format(new Date());
}

async function main(){
  const elPT = document.getElementById("pt");
  const elEN = document.getElementById("en");
  const elDate = document.getElementById("date");
  elDate.textContent = formatLisbonLongDate();

  const res = await fetch("phrases.json", { cache: "no-store" });
  const phrases = await res.json();

  const today = getLisbonYMD();
  const start = parseYMD(START_DATE);
  const idx = ((dayNum(today)-dayNum(start)) % phrases.length + phrases.length) % phrases.length;

  elPT.textContent = phrases[idx].pt || "";
  elEN.textContent = phrases[idx].en || "";
}
main().catch(e=>{
  document.getElementById("pt").textContent = "Erro ao carregar frases.";
  document.getElementById("en").textContent = String(e);
});
