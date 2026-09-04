"use strict";
const CONFIG = {
  site: "gorelikov.ae",
  abacusNs: "gorelikov.ae",
  donateUrl: "",
  donateEmail: "artem@gorelikov.ae",
  donateQr: "/img/donate-qr.png",
  metrikaId: 112279782
};

function isProdHost() {
  return /^(www\.)?gorelikov\.ae$/i.test(location.hostname);
}
function fmtCount(n) {
  return Number(n).toLocaleString("ru-RU");
}

const THEMES = [
  { id: "y2k",      name: "Y2K",           sw: ["#ffd6f5", "#ff2fb3", "#7b2ff7"], decor: "✦" },
  { id: "neon",     name: "Неон",          sw: ["#0b0614", "#00ffc8", "#b026ff"], decor: "" },
  { id: "kawaii",   name: "Kawaii",        sw: ["#fff0f6", "#ff7fab", "#dcefff"], decor: "★" },
  { id: "vapor",    name: "Vaporwave",     sw: ["#16082b", "#67e8f9", "#ec4899"], decor: "" },
  { id: "minimal",  name: "Минимал",       sw: ["#f7f7f8", "#6366f1", "#ffffff"], decor: "" },
  { id: "notebook", name: "Тетрадь",       sw: ["#fdfcf5", "#1e3a8a", "#d23c3c"], decor: "" },
  { id: "brutal",   name: "Брутализм",     sw: ["#f4f1ea", "#0a0a0a", "#ff3b00"], decor: "" },
  { id: "academia", name: "Dark Academia", sw: ["#efe5cf", "#7a2020", "#382a1e"], decor: "" },
  { id: "glass",    name: "Градиент",      sw: ["#5b21b6", "#2563eb", "#db2777"], decor: "" },
  { id: "sticker",  name: "Стикеры",       sw: ["#fef9c3", "#16a34a", "#1f2937"], decor: "⚡" },
  { id: "minecraft", name: "Пиксель-крафт", sw: ["#5c8c3e", "#8b5a2b", "#7ec0ee"], decor: "" },
  { id: "potter",   name: "Волшебная академия", sw: ["#1a0f14", "#c9a227", "#7a1f2b"], decor: "⚡" },
  { id: "russia",   name: "Россия",        sw: ["#ffffff", "#0039a6", "#d52b1e"], decor: "" },
  { id: "custom",   name: "Свой стиль",    sw: ["#101322", "#ffd166", "#1c2136"], decor: "" }
];
const DAY_NAMES = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const DAY_FULL = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const SCHOOL_TIMES = ["8:30", "9:25", "10:20", "11:20", "12:20", "13:15", "14:10", "15:05", "16:00", "16:55"];
const UNI_TIMES = ["9:00", "10:40", "12:20", "14:30", "16:10", "17:50", "19:30", "21:00", "21:30", "22:00"];
const LS_KEY = "raspisalka-v4";
const MAX_ROWS = 16;
const KIND_NAME = { lesson: "урок", break: "перемена", meal: "еда", walk: "прогулка" };

const SCHOOL_DEMO = [
  ["Разговоры о важном", "Русский язык", "Алгебра", "История", "Английский", "Физра", ""],
  ["Русский язык\nкаб. 214", "Алгебра", "Физика\nкаб. 12", "Литература", "Физра", "Музыка", ""],
  ["Алгебра", "Английский\nкаб. 8", "Химия", "География", "Музыка", "", ""],
  ["История", "Физра", "Русский язык", "Алгебра", "ИЗО", "", ""],
  ["Физра", "Биология", "Обществознание", "Технология", "Информатика", "", ""],
  ["Английский", "География", "Информатика\nкаб. 3", "Литература", "", "", ""],
  ["", "", "Классный час", "", "", "", ""]
];
const UNI_DEMO = [
  ["Матан\nауд. 301", "Линал\nауд. 210", "Прога\nлаб. 4", "Философия", "Английский", "Физра", ""],
  ["Физика", "Английский", "Матан", "История", "Экономика", "", ""],
  ["Прога", "Дискретная математика", "Физра", "", "Прога\nлаб. 4", "", ""],
  ["", "Теория вероятностей", "", "Право", "", "", ""]
];
const UNI_DEMO_B = [
  ["Матан\nауд. 305", "Философия", "Прога\nлаб. 2", "Линал", "Английский", "", ""],
  ["История", "Физика", "Матан", "", "Экономика", "Физра", ""],
  ["Прога", "", "Физра", "Право", "", "", ""],
  ["Курсовой", "Теория вероятностей", "", "", "", "", ""]
];
const SCHOOL_INFO = [
  "Все должны быть в школе к 8:10 каждый день.",
  "Если ребёнок заболел — сообщите до 8:10.",
  "Пропуск не по болезни — нужно заявление."
];
const SCHOOL_TEACHERS = [
  { subject: "Английский язык", names: "Анна Сергеевна", room: "каб. 8", color: "#e8b84a" },
  { subject: "Информатика", names: "Павел Игоревич", room: "каб. 3", color: "#6366f1" },
  { subject: "ИЗО", names: "Варвара Петровна", room: "каб. 57", color: "#fb7185" },
  { subject: "Технология", names: "Константин Александрович", room: "каб. 36", color: "#a16207" }
];
const SCHOOL_KINDS = ["lesson","meal","lesson","break","lesson","break","lesson","break","lesson","meal","lesson","lesson"];
const SCHOOL_LABELS = ["","Завтрак","","Перемена","","Перемена","","Перемена","","Обед","",""];
const SCHOOL_SLOT_TIMES = ["8:30","9:10","9:25","10:05","10:20","11:00","11:20","11:55","12:20","12:50","13:15","14:10"];

function emptyGrid() {
  return Array.from({ length: MAX_ROWS }, () => Array(7).fill(""));
}
const PAINT_SWATCHES = [
  "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444",
  "#14b8a6", "#fb7185", "#6366f1", "#f472b6", "#22d3ee",
  "#a3e635", "#facc15"
];
function sanitizePaint(c) {
  const t = String(c || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(t) ? t.toLowerCase() : "";
}
function fillLessons(demo, kinds) {
  const g = emptyGrid();
  const lessonAt = [];
  kinds.forEach((k, i) => { if (k === "lesson") lessonAt.push(i); });
  demo.forEach((row, ri) => {
    const r = lessonAt[ri];
    if (r == null) return;
    row.forEach((v, d) => { g[r][d] = v; });
  });
  return g;
}
function padKinds(n, kinds, labels, times, fallbackTimes) {
  const k = (kinds || []).slice();
  const l = (labels || []).slice();
  const t = (times || []).slice();
  while (k.length < n) k.push("lesson");
  while (l.length < n) l.push("");
  while (t.length < n) t.push(fallbackTimes[t.length] || "");
  return { kinds: k.slice(0, n), labels: l.slice(0, n), times: t.slice(0, Math.max(n, 10)) };
}
function defaultState(mode = "school") {
  const uni = mode === "uni";
  const kinds = uni ? ["lesson","lesson","break","lesson","lesson"] : SCHOOL_KINDS.slice();
  const labels = uni ? ["","","Перерыв","",""] : SCHOOL_LABELS.slice();
  const rows = kinds.length;
  const times = uni
    ? ["9:00","10:40","12:00","12:20","14:30","16:10","17:50","19:30","21:00","21:30","22:00","22:30"].slice()
    : SCHOOL_SLOT_TIMES.concat(SCHOOL_TIMES).slice(0, MAX_ROWS);
  return {
    v: 4,
    mode,
    theme: uni ? "neon" : "y2k",
    title: uni ? "ПИ-231" : "7 «Б»",
    sub: uni ? "осенний семестр · 2026/27" : "2026/27 учебный год",
    days: uni ? [1, 1, 1, 1, 1, 1, 0] : [1, 1, 1, 1, 1, 0, 0],
    rows,
    times,
    kinds,
    labels,
    dual: false,
    activeGrid: 0,
    cells: uni ? [fillLessons(UNI_DEMO, kinds), fillLessons(UNI_DEMO_B, kinds)] : [fillLessons(SCHOOL_DEMO, kinds), emptyGrid()],
    showInfo: !uni,
    info: uni ? [] : SCHOOL_INFO.slice(),
    teachers: uni ? [] : SCHOOL_TEACHERS.map((t) => Object.assign({}, t)),
    custom: {
      bg: "#101322", card: "#1c2136", ink: "#f2f4ff", acc: "#ffd166",
      font: "Manrope, sans-serif", rad: 16, pat: "", emoji: "✦"
    },
    wm: true,
    fmt: "auto",
    paints: [emptyGrid(), emptyGrid()]
  };
}

let state = loadState();
function hydrateState(s) {
  if (!s || typeof s !== "object" || ![2, 3, 4].includes(s.v)) return null;
  const base = defaultState(s.mode || "school");
  const merged = Object.assign(base, s, { v: 4 });
  merged.rows = Math.max(1, Math.min(MAX_ROWS, Number(merged.rows) || base.rows));
  if (!Array.isArray(merged.days) || merged.days.length !== 7) merged.days = base.days.slice();
  if (!Array.isArray(merged.cells) || merged.cells.length < 2) merged.cells = base.cells;
  merged.cells = merged.cells.map((g) => {
    const ng = emptyGrid();
    (g || []).forEach((row, r) => { if (r < MAX_ROWS) ng[r] = (row || []).concat(["","","","","","",""]).slice(0, 7); });
    return ng;
  });
  while (merged.cells.length < 2) merged.cells.push(emptyGrid());
  if (!Array.isArray(s.kinds)) {
    merged.kinds = Array.from({ length: merged.rows || 7 }, () => "lesson");
    merged.labels = Array.from({ length: merged.rows || 7 }, () => "");
  }
  const padded = padKinds(merged.rows || base.rows, merged.kinds, merged.labels, merged.times, merged.mode === "uni" ? UNI_TIMES : SCHOOL_TIMES);
  merged.kinds = padded.kinds;
  merged.labels = padded.labels;
  merged.times = padded.times;
  if (!Array.isArray(merged.info)) merged.info = [];
  if (!Array.isArray(merged.teachers)) merged.teachers = [];
  if (merged.showInfo == null) merged.showInfo = false;
  if (!merged.custom || typeof merged.custom !== "object") merged.custom = base.custom;
  if (merged.theme === "ru-gold") merged.theme = "russia";
  else if (!THEMES.some((t) => t.id === merged.theme)) merged.theme = base.theme;
  if (!Array.isArray(merged.paints) || merged.paints.length < 2) merged.paints = [emptyGrid(), emptyGrid()];
  merged.paints = merged.paints.map((g) => {
    const ng = emptyGrid();
    (g || []).forEach((row, r) => {
      if (r >= MAX_ROWS) return;
      ng[r] = (row || []).concat(["", "", "", "", "", "", ""]).slice(0, 7).map(sanitizePaint);
    });
    return ng;
  });
  while (merged.paints.length < 2) merged.paints.push(emptyGrid());
  return merged;
}
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY) || localStorage.getItem("raspisalka-v3") || localStorage.getItem("raspisalka-v2");
    if (!raw) return defaultState();
    return hydrateState(JSON.parse(raw)) || defaultState();
  } catch { return defaultState(); }
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

const $ = (sel) => document.querySelector(sel);
function listen(sel, ev, fn) {
  const el = typeof sel === "string" ? $(sel) : sel;
  if (!el) return;
  el.addEventListener(ev, fn);
}
function onClick(sel, fn) {
  const el = $(sel);
  if (el) el.onclick = fn;
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function splitCell(val) {
  const raw = String(val || "").replace(/\r/g, "");
  const i = raw.indexOf("\n");
  if (i < 0) return { subj: raw, note: "" };
  return { subj: raw.slice(0, i), note: raw.slice(i + 1).replace(/^\n+/, "") };
}
function joinCell(subj, note) {
  const s = String(subj || "").replace(/\n+/g, " ").replace(/\s+$/, "");
  const n = String(note || "").replace(/^\s+|\s+$/g, "");
  return n ? s + "\n" + n : s;
}
function cellInnerHtml(val, r, d) {
  const { subj, note } = splitCell(val);
  return `<span class="s-subj" contenteditable="true" spellcheck="false" data-r="${r}" data-d="${d}" data-part="subj">${esc(subj)}</span><span class="s-note" contenteditable="true" spellcheck="false" data-r="${r}" data-d="${d}" data-part="note">${esc(note)}</span>`;
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function subjectCat(raw) {
  const t = String(raw || "").toLowerCase().split("\n")[0].trim();
  if (!t || t === "—" || t === "-" || t === "+") return "empty";
  const rules = [
    ["math", /матем|алгебр|геометр|матан|линал|дискре|теорвер|мат\.|мат /],
    ["rus", /русск|родн(ой|ая)|сочин/],
    ["lit", /литер|чтение|литра/],
    ["eng", /англ|инглиш|иностр|немец|франц|испан|китай/],
    ["pe", /физр|физкул|спорт/],
    ["sci", /физик|хими|биолог|природ|окруж|геогр|эколог|астрон/],
    ["hist", /истор|обществ|обж|право|эконом|философ|полит/],
    ["art", /изо|музык|мхк|рисов|театр|хорео/],
    ["it", /информат|програм|прога|компью|икт|верстк|курсов/],
    ["tech", /труд|технолог|черчен/],
    ["hum", /классн|разговор|важн|проект|психол/]
  ];
  for (const [cat, re] of rules) if (re.test(t)) return cat;
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) >>> 0;
  return "p" + (h % 8);
}

async function counterFetch(kind, action) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(
      `https://abacus.jasoncameron.dev/${kind}/${encodeURIComponent(CONFIG.abacusNs)}/${encodeURIComponent(action)}`,
      { cache: "no-store", signal: ctrl.signal }
    );
    const j = await r.json();
    return Number(j.value) || 0;
  } catch { return null; }
  finally { clearTimeout(t); }
}
async function counterHit(action) {
  if (!isProdHost()) return counterGet(action);
  return counterFetch("hit", action);
}
async function counterGet(action) {
  return counterFetch("get", action);
}
let thanksCount = 0;
function setThanksStat(n) {
  if (n != null && !Number.isNaN(Number(n))) thanksCount = Number(n);
  const label = n == null ? "…" : fmtCount(thanksCount);
  document.querySelectorAll("[data-thanks]").forEach((b) => {
    b.innerHTML = `спасибо <b>${label}</b>`;
  });
}
async function sayThanks() {
  if (isProdHost()) {
    const n = await counterHit("thanks");
    setThanksStat(n == null ? thanksCount : n);
  } else {
    setThanksStat(thanksCount + 1);
  }
  toast("Спасибо!");
  metrikaGoal("thanks");
}
function setCreatedStat(n) {
  const el = $("#statCreated");
  if (!el || n == null || Number.isNaN(Number(n))) return;
  el.textContent = fmtCount(n);
}
function setVisitsStat(n) {
  const visitsEl = $("#statVisits");
  const foot = $("#statFooter");
  if (!n) {
    if (visitsEl) visitsEl.textContent = "live";
    return;
  }
  if (visitsEl) visitsEl.textContent = fmtCount(n);
  const created = $("#statCreated")?.textContent;
  const createdBit = created && created !== "…" && created !== "0" ? ` · ${created} расписаний` : "";
  if (foot) foot.textContent = `${fmtCount(n)} заходов${createdBit}`;
}
async function markScheduleCreated(source) {
  metrikaGoal("schedule_created", { source });
  try {
    if (sessionStorage.getItem("rc")) return;
  } catch {}
  const n = await counterHit("created");
  if (n) {
    try { sessionStorage.setItem("rc", String(n)); } catch {}
    setCreatedStat(n);
  }
}

const sheet = $("#sheet");
const dayEditor = $("#dayEditor");
const COMPACT_MQ = window.matchMedia("(max-width: 1200px)");
function isCompact() { return COMPACT_MQ.matches; }
let editDay = 0;

function syncCompact() {
  const on = isCompact();
  document.body.classList.toggle("compact", on);
  document.querySelectorAll("#fmtSel option.fmt-extra").forEach((o) => { o.hidden = on; });
  if (!on) closePreview(true);
}

function ensureEditDay() {
  const days = activeDayIdx();
  if (!days.length) { editDay = 0; return; }
  if (!days.includes(editDay)) editDay = days[0];
}

function sheetHome() {
  const stage = $(".stage");
  if (sheet && stage && sheet.parentElement !== stage) stage.appendChild(sheet);
  if (sheet) {
    sheet.style.transform = "";
    sheet.style.marginBottom = "";
  }
}

function scalePreview() {
  const port = $("#previewPort");
  if (!sheet || !port || !document.body.classList.contains("preview-open")) return;
  sheet.style.transform = "none";
  const pad = 8;
  const sw = sheet.offsetWidth || 1123;
  const scale = Math.min(1, Math.max(0.2, (port.clientWidth - pad) / sw));
  sheet.style.transformOrigin = "top center";
  sheet.style.transform = `scale(${scale})`;
  const sh = Math.ceil((sheet.offsetHeight || 0) * scale);
  port.style.minHeight = sh + 16 + "px";
}

function openPreview() {
  if (!isCompact() || !sheet) return;
  renderSheet();
  const port = $("#previewPort");
  const scrim = $("#previewScrim");
  if (!port || !scrim) return;
  document.body.classList.add("preview-open");
  port.appendChild(sheet);
  scrim.hidden = false;
  requestAnimationFrame(() => {
    scalePreview();
    requestAnimationFrame(scalePreview);
  });
}

function closePreview(silent) {
  const was = document.body.classList.contains("preview-open");
  document.body.classList.remove("preview-open");
  const scrim = $("#previewScrim");
  if (scrim) scrim.hidden = true;
  const port = $("#previewPort");
  if (port) port.style.minHeight = "";
  sheetHome();
  if (was && !silent) renderDayEditor();
}
function activeDayIdx() {
  return state.days.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
}
function grid() {
  return state.cells[state.dual ? state.activeGrid : 0];
}
function paintsGrid() {
  if (!Array.isArray(state.paints) || state.paints.length < 2) state.paints = [emptyGrid(), emptyGrid()];
  return state.paints[state.dual ? state.activeGrid : 0];
}
function getPaint(r, d) {
  const g = paintsGrid();
  return sanitizePaint(g[r] && g[r][d]);
}
function setPaint(r, d, color) {
  const g = paintsGrid();
  if (!g[r]) g[r] = Array(7).fill("");
  g[r][d] = sanitizePaint(color);
}
function paintClassAndStyle(val, r, d) {
  const cat = subjectCat(val);
  const paint = cat === "empty" ? "" : getPaint(r, d);
  const cls = `s-cell cat-${cat}${paint ? " is-painted" : ""}`;
  const style = paint ? ` style="--cell-fill:${esc(paint)}"` : "";
  return { cat, paint, cls, style };
}
function applyCellLook(cell, val, r, d) {
  const { cat, paint } = paintClassAndStyle(val, r, d);
  cell.className = `s-cell cat-${cat}${paint ? " is-painted" : ""}`;
  cell.dataset.r = String(r);
  cell.dataset.d = String(d);
  if (paint) cell.style.setProperty("--cell-fill", paint);
  else cell.style.removeProperty("--cell-fill");
}

let paintBrush = null;
function setPaintBrush(val) {
  paintBrush = val;
  document.body.classList.toggle("paint-mode", !!paintBrush);
  renderPalette();
}
function renderPalette() {
  const box = $("#paintPalette");
  if (!box) return;
  const autoOn = paintBrush === "auto";
  let html = `<button type="button" class="psw auto${autoOn ? " on" : ""}" data-paint="auto" title="Авто по предмету">авто</button>`;
  PAINT_SWATCHES.forEach((c) => {
    html += `<button type="button" class="psw${paintBrush === c ? " on" : ""}" data-paint="${c}" style="background:${c}" title="${c}"></button>`;
  });
  box.innerHTML = html;
}

function applyThemeTo(el, themeId) {
  const th = THEMES.find((t) => t.id === themeId) || THEMES[0];
  el.className = `sheet th-${th.id} fmt-${el === sheet ? state.fmt : "auto"}` + ((el === sheet && !state.wm) ? " no-wm" : "");
  el.removeAttribute("style");
  let decor = th.decor;
  if (themeId === "custom") {
    const c = state.custom;
    if (c.pat) el.classList.add(c.pat);
    el.style.setProperty("--s-bg", c.bg);
    el.style.setProperty("--s-bg-c", c.bg);
    el.style.setProperty("--s-card", c.card);
    el.style.setProperty("--s-ink", c.ink);
    el.style.setProperty("--s-mut", c.ink + "99");
    el.style.setProperty("--s-acc", c.acc);
    el.style.setProperty("--s-line", c.ink + "26");
    el.style.setProperty("--s-rad", c.rad + "px");
    el.style.setProperty("--s-hfont", c.font);
    el.style.setProperty("--s-font", c.font);
    if (!c.pat) el.style.background = c.bg;
    decor = c.emoji;
  }
  return decor;
}

function renderSheet() {
  if (!sheet) return;
  const days = activeDayIdx();
  const uni = state.mode === "uni";
  applyThemeTo(sheet, state.theme);
  const badge = state.dual
    ? `<span class="s-badge">${state.activeGrid === 0 ? "числитель" : "знаменатель"}</span>` : "";

  let extra = "";
  if (state.showInfo) {
    const info = (state.info || []).filter(Boolean);
    const teachers = state.teachers || [];
    extra = `<div class="s-extra">
      <div class="s-box">
        <h3>Важная информация</h3>
        <ul class="s-rules">
          ${info.map((t, i) => `<li><span class="n">${i + 1}</span><span>${esc(t)}</span></li>`).join("") || `<li><span class="n">i</span><span>Добавь пункты слева в панели</span></li>`}
        </ul>
      </div>
      <div class="s-box">
        <h3>${uni ? "Преподаватели и аудитории" : "Учителя и кабинеты"}</h3>
        <div class="s-teachers">
          ${teachers.map((t) => `
            <div class="s-teach">
              <div class="bar" style="background:${esc(t.color || "var(--s-acc)")}"></div>
              <div><strong>${esc(t.subject || "")}</strong><em>${(t.names || "").split("\n").map((n) => esc(n)).join("<br>")}</em></div>
              <div class="room">${esc(t.room || "")}</div>
            </div>`).join("") || `<div class="s-teach"><div class="bar"></div><div><strong>Добавь предметы слева</strong></div></div>`}
        </div>
      </div>
    </div>`;
  }

  let html = `
    <header class="s-head">
      <h2 class="s-title" contenteditable="true" spellcheck="false" data-bind="title">${esc(state.title)}</h2>
      <div class="s-tagrow"><span class="s-tag">расписание</span>${badge}</div>
      <div class="s-sub" contenteditable="true" spellcheck="false" data-bind="sub">${esc(state.sub)}</div>
    </header>
    ${extra}
    <div class="s-grid" style="--days:${days.length}">
      <div class="s-headrow">
        <div class="s-corner"></div>`;
  for (const d of days) html += `<div class="s-dayh">${DAY_NAMES[d]}</div>`;
  html += `</div>`;
  const g = grid() || emptyGrid();
  for (let r = 0; r < state.rows; r++) {
    const kind = (state.kinds && state.kinds[r]) || "lesson";
    const row = g[r] || [];
    html += `<div class="s-row" data-row="${r}">`;
    if (kind === "lesson") {
      html += `<div class="s-num" data-drag-row="${r}"><span class="grip" title="Перетащить">⋮⋮</span><span class="s-time" contenteditable="true" spellcheck="false" data-time="${r}">${esc(state.times[r] || "")}</span></div>`;
      for (const d of days) {
        const val = row[d] || "";
        const look = paintClassAndStyle(val, r, d);
        html += `<div class="${look.cls}" data-r="${r}" data-d="${d}"${look.style}>${cellInnerHtml(val, r, d)}</div>`;
      }
    } else {
      html += `<div class="s-num" data-drag-row="${r}"><span class="grip" title="Перетащить">⋮⋮</span><span class="s-time" contenteditable="true" spellcheck="false" data-time="${r}">${esc(state.times[r] || "")}</span></div>`;
      html += `<div class="s-span kind-${kind}" contenteditable="true" spellcheck="false" data-span="${r}">${esc(state.labels[r] || KIND_NAME[kind])}</div>`;
    }
    html += `</div>`;
  }
  html += `</div><footer class="s-foot"><img class="s-foot-logo" src="/img/logo.png" alt="" width="16" height="16">расписалка</footer>`;
  sheet.innerHTML = html;
  renderDayEditor();
}

function renderDayEditor() {
  const root = dayEditor;
  if (!root) return;
  if (!isCompact() || !document.body.classList.contains("mode-edit")) {
    root.innerHTML = "";
    return;
  }
  const typing = root.contains(document.activeElement) &&
    document.activeElement.closest(".s-cell, .s-span, .s-time, [data-bind]");
  if (typing) return;
  ensureEditDay();
  const d = editDay;
  const days = activeDayIdx();
  const g = grid() || emptyGrid();
  const tabs = days.map((di) =>
    `<button type="button" class="day-tab${di === d ? " on" : ""}" data-edit-day="${di}">${DAY_NAMES[di]}</button>`
  ).join("");
  let slots = "";
  for (let r = 0; r < state.rows; r++) {
    const kind = (state.kinds && state.kinds[r]) || "lesson";
    const time = esc(state.times[r] || "");
    if (kind === "lesson") {
      const val = (g[r] || [])[d] || "";
      const look = paintClassAndStyle(val, r, d);
      slots += `<div class="day-slot" data-row="${r}">
        <span class="grip" title="Перетащить">⋮⋮</span>
        <span class="s-time" contenteditable="true" spellcheck="false" data-time="${r}">${time}</span>
        <div class="${look.cls}" data-r="${r}" data-d="${d}"${look.style}>${cellInnerHtml(val, r, d)}</div>
      </div>`;
    } else {
      slots += `<div class="day-slot is-span" data-row="${r}">
        <span class="grip" title="Перетащить">⋮⋮</span>
        <span class="s-time" contenteditable="true" spellcheck="false" data-time="${r}">${time}</span>
        <div class="s-span kind-${kind}" contenteditable="true" spellcheck="false" data-span="${r}">${esc(state.labels[r] || KIND_NAME[kind])}</div>
      </div>`;
    }
  }
  root.innerHTML = `
    <div class="day-editor-head">
      <h2 class="s-title" contenteditable="true" spellcheck="false" data-bind="title">${esc(state.title)}</h2>
      <div class="s-sub" contenteditable="true" spellcheck="false" data-bind="sub">${esc(state.sub)}</div>
    </div>
    <div class="day-tabs">${tabs || `<span class="hint">Включи хотя бы один день слева</span>`}</div>
    <div class="day-slots">${slots}</div>
    <p class="hint day-editor-hint">Дни сверху — правишь по одному. Предпросмотр покажет весь лист как на картинке.</p>
  `;
}

function onEditorInput(e) {
  const el = e.target;
  if (el.dataset.bind) state[el.dataset.bind] = el.innerText.trim();
  else if (el.dataset.time !== undefined) state.times[+el.dataset.time] = el.innerText.trim();
  else if (el.dataset.span !== undefined) state.labels[+el.dataset.span] = el.innerText.trim();
  else if (el.dataset.part && el.dataset.r !== undefined) {
    const cell = el.closest(".s-cell");
    if (!cell) return;
    const subj = cell.querySelector(".s-subj")?.innerText.replace(/\n+/g, " ") || "";
    const note = cell.querySelector(".s-note")?.innerText.replace(/\n+$/, "") || "";
    const val = joinCell(subj, note);
    const g = grid();
    const r = +el.dataset.r;
    const d = +el.dataset.d;
    if (g) {
      if (!g[r]) g[r] = Array(7).fill("");
      g[r][d] = val;
    }
    if (subjectCat(val) === "empty") setPaint(r, d, "");
    applyCellLook(cell, val, r, d);
  } else return;
  save();
}
function onEditorPaste(e) {
  const part = e.target.dataset && e.target.dataset.part;
  if (!part && !e.target.dataset.bind && e.target.dataset.time === undefined && e.target.dataset.span === undefined) return;
  e.preventDefault();
  let text = (e.clipboardData || window.clipboardData).getData("text/plain");
  if (part === "subj" && text.includes("\n")) {
    const lines = text.split(/\n+/);
    document.execCommand("insertText", false, lines[0]);
    const note = e.target.parentElement.querySelector(".s-note");
    if (note) {
      note.textContent = lines.slice(1).join(" ").trim();
      note.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return;
  }
  document.execCommand("insertText", false, part ? text.replace(/\n+/g, " ") : text);
}
function onEditorKeydown(e) {
  if (e.target.dataset.part === "subj" && e.key === "Enter") {
    e.preventDefault();
    e.target.parentElement.querySelector(".s-note")?.focus();
    return;
  }
  if (e.target.dataset.part === "note" && e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    e.target.blur();
    return;
  }
  if (e.key === "Enter" && !e.shiftKey && (e.target.dataset.bind || e.target.dataset.time !== undefined || e.target.dataset.span !== undefined)) {
    e.preventDefault();
    e.target.blur();
  }
}
function onEditorPointerDown(e) {
  const root = e.currentTarget;
  if (paintBrush) {
    const cell = e.target.closest?.(".s-cell");
    if (cell && root.contains(cell) && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      const r = +cell.dataset.r;
      const d = +cell.dataset.d;
      if (!Number.isFinite(r) || !Number.isFinite(d)) return;
      const val = (grid()?.[r] || [])[d] || "";
      if (subjectCat(val) === "empty") {
        toast("Сначала напиши предмет");
        return;
      }
      setPaint(r, d, paintBrush === "auto" ? "" : paintBrush);
      save();
      applyCellLook(cell, val, r, d);
      return;
    }
  }
  const cell = e.target.closest?.(".s-cell");
  if (!cell || e.target.closest(".s-subj, .s-note")) return;
  cell.querySelector(".s-subj")?.focus();
}
function bindEditorRoot(root) {
  if (!root || root.dataset.edBound) return;
  root.dataset.edBound = "1";
  root.addEventListener("input", onEditorInput);
  root.addEventListener("paste", onEditorPaste);
  root.addEventListener("keydown", onEditorKeydown);
  root.addEventListener("pointerdown", onEditorPointerDown, true);
}
bindEditorRoot(sheet);
bindEditorRoot(dayEditor);
dayEditor?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit-day]");
  if (!b || !dayEditor.contains(b)) return;
  editDay = +b.dataset.editDay;
  renderDayEditor();
});
onClick("#previewBtn", openPreview);
onClick("#previewClose", () => closePreview());
onClick("#previewDl", downloadPng);
COMPACT_MQ.addEventListener("change", () => {
  syncCompact();
  if (document.body.classList.contains("mode-edit")) {
    renderControls();
    renderSheet();
  }
});
window.addEventListener("resize", () => {
  if (document.body.classList.contains("preview-open")) scalePreview();
});

function renderControls() {
  try {
  syncCompact();
  document.querySelectorAll("#modeSeg button").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === state.mode));
  const rowsLabel = $("#rowsLabel");
  if (rowsLabel) rowsLabel.textContent = "Строки расписания";
  const chips = $("#dayChips");
  if (chips) {
  chips.innerHTML = "";
  DAY_NAMES.forEach((n, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (state.days[i] ? " on" : "");
    b.textContent = n;
    b.title = DAY_FULL[i];
    b.onclick = () => {
      if (state.days[i] && activeDayIdx().length === 1) return toast("Хотя бы один день оставь");
      state.days[i] = state.days[i] ? 0 : 1;
      save(); renderControls(); renderSheet();
    };
    chips.appendChild(b);
  });
  }
  const rowCount = $("#rowCount");
  if (rowCount) rowCount.textContent = lessonCount();
  const dualChk = $("#dualChk");
  if (dualChk) dualChk.checked = !!state.dual;
  $("#weekTabs")?.classList.toggle("show", !!state.dual);
  document.querySelectorAll("#weekTabs button").forEach((b) =>
    b.classList.toggle("active", +b.dataset.g === state.activeGrid));
  const tg = $("#themeGrid");
  if (tg) {
    tg.innerHTML = "";
    THEMES.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tbtn" + (state.theme === t.id ? " active" : "");
      b.innerHTML = `<span class="nm">${t.name}</span><span class="sw">${t.sw.map((c) => `<i style="background:${c}"></i>`).join("")}</span>`;
      b.onclick = () => { state.theme = t.id; save(); renderControls(); renderSheet(); };
      tg.appendChild(b);
    });
  }
  $("#customPanel")?.classList.toggle("show", state.theme === "custom");
  const c = state.custom || {};
  const setVal = (id, val, prop) => { const el = $(id); if (el) el[prop] = val; };
  setVal("#cBg", c.bg, "value"); setVal("#cCard", c.card, "value");
  setVal("#cInk", c.ink, "value"); setVal("#cAcc", c.acc, "value");
  setVal("#cFont", c.font, "value"); setVal("#cRad", c.rad, "value");
  setVal("#cPat", c.pat, "value"); setVal("#cEmoji", c.emoji, "value");
  setVal("#fmtSel", state.fmt, "value");
  const wmChk = $("#wmChk");
  if (wmChk) wmChk.checked = !!state.wm;
  const infoChk = $("#infoChk");
  if (infoChk) infoChk.checked = !!state.showInfo;
  const infoFields = $("#infoFields");
  if (infoFields) infoFields.hidden = !state.showInfo;
  const infoText = $("#infoText");
  if (infoText && document.activeElement !== infoText) infoText.value = (state.info || []).join("\n");
  renderTeachers();
  renderSlots();
  renderPalette();
  } catch (err) {
    console.error("renderControls", err);
  }
}

listen("#paintPalette", "click", (e) => {
  const b = e.target.closest("[data-paint]");
  if (!b) return;
  const v = b.dataset.paint;
  if (!v) return;
  if (paintBrush === v) {
    setPaintBrush(null);
    return;
  }
  const first = !paintBrush;
  setPaintBrush(v);
  if (first) toast(v === "auto" ? "Кисть: авто. Кликай по урокам" : "Кликай по урокам — Esc выключает кисть");
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !paintBrush) return;
  setPaintBrush(null);
});

listen("#modeSeg", "click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.dataset.mode === state.mode) return;
  applyTemplate(b.dataset.mode === "uni" ? "uni" : "school", false);
});
listen("#dualChk", "change", (e) => {
  state.dual = e.target.checked;
  if (!state.dual) state.activeGrid = 0;
  save(); renderControls(); renderSheet();
  if (state.dual) toast("Вверху вкладки недель I и II");
});
listen("#weekTabs", "click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  state.activeGrid = +b.dataset.g;
  save(); renderControls(); renderSheet();
});
onClick("#rowPlus", () => addSlot("lesson"));
onClick("#rowMinus", () => {
  if (state.rows <= 1) return;
  state.rows--;
  save(); renderControls(); renderSheet();
});

function addSlot(kind) {
  if (state.rows >= MAX_ROWS) return toast("Максимум " + MAX_ROWS + " строк");
  let type = kind;
  let label = "";
  let time = "";
  if (kind === "breakfast") { type = "meal"; label = "Завтрак"; time = "9:10"; }
  else if (kind === "lunch") { type = "meal"; label = "Обед"; time = "13:00"; }
  else if (kind === "break") { type = "break"; label = "Перемена"; time = "10:05"; }
  else if (kind === "walk") { type = "walk"; label = "Прогулка"; time = "14:00"; }
  else { type = "lesson"; time = (state.mode === "uni" ? UNI_TIMES : SCHOOL_TIMES)[lessonCount()] || ""; }
  state.kinds[state.rows] = type;
  state.labels[state.rows] = label;
  state.times[state.rows] = time;
  state.rows++;
  save(); renderControls(); renderSheet();
  toast(type === "lesson" ? "Добавлен урок" : "Строка на всю ширину: " + label);
}
function lessonCount() {
  return (state.kinds || []).slice(0, state.rows).filter((k) => k === "lesson").length;
}
function renderSlots() {
  const box = $("#slotList");
  if (!box) return;
  box.innerHTML = "";
  for (let i = 0; i < state.rows; i++) {
    const kind = state.kinds[i] || "lesson";
    const row = document.createElement("div");
    row.className = "slot-row";
    row.dataset.row = String(i);
    row.innerHTML = `<span class="grip" title="Перетащить" data-drag-row="${i}">⋮⋮</span><b>${i + 1}</b><span>${esc(state.times[i] || "")} · ${esc(kind === "lesson" ? (state.mode === "uni" ? "пара" : "урок") : (state.labels[i] || KIND_NAME[kind]))}</span>
      <select data-kind="${i}">
        <option value="lesson"${kind === "lesson" ? " selected" : ""}>${state.mode === "uni" ? "пара" : "урок"}</option>
        <option value="break"${kind === "break" ? " selected" : ""}>перемена</option>
        <option value="meal"${kind === "meal" ? " selected" : ""}>завтрак/обед</option>
        <option value="walk"${kind === "walk" ? " selected" : ""}>прогулка</option>
      </select>
      <button type="button" data-del="${i}" title="Удалить">✕</button>`;
    box.appendChild(row);
  }
}
function renderTeachers() {
  const box = $("#teacherList");
  if (!box) return;
  box.innerHTML = "";
  (state.teachers || []).forEach((t, idx) => {
    const card = document.createElement("div");
    card.className = "tcard";
    card.dataset.tidx = String(idx);
    card.innerHTML = `<div class="top"><span class="grip" title="Перетащить" data-drag-teacher="${idx}">⋮⋮</span><strong>Предмет ${idx + 1}</strong><button type="button" data-tdel="${idx}">✕</button></div>
      <input type="text" data-tf="subject" data-i="${idx}" placeholder="Предмет" value="${esc(t.subject || "")}" />
      <textarea data-tf="names" data-i="${idx}" placeholder="ФИО, каждое с новой строки">${esc(t.names || "")}</textarea>
      <div class="row2">
        <input type="text" data-tf="room" data-i="${idx}" placeholder="каб. 56" value="${esc(t.room || "")}" />
        <input type="color" data-tf="color" data-i="${idx}" value="${t.color || "#6366f1"}" />
      </div>`;
    box.appendChild(card);
  });
}

function moveItem(arr, from, to) {
  if (!arr || from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
}
function moveRow(from, to) {
  if (from === to) return;
  moveItem(state.kinds, from, to);
  moveItem(state.labels, from, to);
  moveItem(state.times, from, to);
  (state.cells || []).forEach((g) => moveItem(g, from, to));
  (state.paints || []).forEach((g) => moveItem(g, from, to));
  save(); renderControls(); renderSheet();
}
function moveTeacher(from, to) {
  if (from === to) return;
  moveItem(state.teachers, from, to);
  save(); renderTeachers(); renderSheet();
}
function scrollParent(el) {
  let n = el;
  while (n && n !== document.body) {
    const s = getComputedStyle(n);
    if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 4) return n;
    n = n.parentElement;
  }
  return document.scrollingElement;
}
function bindSortable(root, { itemSel, handleSel, onMove }) {
  if (!root) return;
  let session = null;
  const THRESH = 8;

  function list() {
    return [...root.querySelectorAll(itemSel)];
  }
  function dropTo(y, from) {
    const items = list();
    let to = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { to = i; break; }
    }
    if (from < to) to--;
    return Math.max(0, Math.min(items.length - 1, to));
  }
  function highlight(y, from) {
    const items = list();
    items.forEach((el) => el.classList.remove("is-over"));
    let idx = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { idx = i; break; }
    }
    const target = items[idx] || items[items.length - 1];
    if (target && items.indexOf(target) !== from) target.classList.add("is-over");
  }
  function endSession() {
    if (!session) return;
    session.item.classList.remove("is-drag");
    list().forEach((el) => el.classList.remove("is-over"));
    document.body.classList.remove("is-sorting");
    if (session.ghost) session.ghost.remove();
    try { session.handle.releasePointerCapture(session.pointerId); } catch (_) {}
    session = null;
  }

  root.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("input, textarea, select, button, [contenteditable]")) return;
    const handle = e.target.closest(handleSel);
    if (!handle || !root.contains(handle)) return;
    const item = handle.closest(itemSel);
    if (!item) return;
    const from = list().indexOf(item);
    if (from < 0) return;
    session = {
      pointerId: e.pointerId,
      from,
      item,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      ghost: null,
      ox: 0,
      oy: 0
    };
  });
  window.addEventListener("pointermove", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    if (!session.started) {
      if (Math.hypot(dx, dy) < THRESH) return;
      session.started = true;
      session.item.classList.add("is-drag");
      document.body.classList.add("is-sorting");
      const ghost = session.item.cloneNode(true);
      ghost.classList.add("drag-ghost");
      ghost.classList.remove("is-drag", "is-over");
      ghost.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
      const r = session.item.getBoundingClientRect();
      const days = getComputedStyle(session.item.parentElement || session.item).getPropertyValue("--days");
      if (days) ghost.style.setProperty("--days", days.trim() || "5");
      ghost.style.width = r.width + "px";
      ghost.style.left = r.left + "px";
      ghost.style.top = r.top + "px";
      session.ox = e.clientX - r.left;
      session.oy = e.clientY - r.top;
      (session.item.parentElement || document.body).appendChild(ghost);
      session.ghost = ghost;
      try { session.handle.setPointerCapture(e.pointerId); } catch (_) {}
    }
    e.preventDefault();
    session.ghost.style.left = (e.clientX - session.ox) + "px";
    session.ghost.style.top = (e.clientY - session.oy) + "px";
    highlight(e.clientY, session.from);
    const scroller = scrollParent(root);
    if (scroller) {
      const box = scroller.getBoundingClientRect ? scroller.getBoundingClientRect() : { top: 0, bottom: innerHeight };
      const edge = 56;
      if (e.clientY < box.top + edge) scroller.scrollTop -= 18;
      else if (e.clientY > box.bottom - edge) scroller.scrollTop += 18;
    }
  }, { passive: false });
  window.addEventListener("pointerup", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    const { from, started } = session;
    const y = e.clientY;
    endSession();
    if (!started) return;
    const blockClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener("click", blockClick, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", blockClick, true), 80);
    const to = dropTo(y, from);
    if (to !== from) onMove(from, to);
  });
  window.addEventListener("pointercancel", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    endSession();
  });
}
bindSortable(sheet, { itemSel: ".s-row", handleSel: ".grip", onMove: moveRow });
bindSortable(dayEditor, { itemSel: ".day-slot", handleSel: ".grip", onMove: moveRow });
bindSortable($("#slotList"), { itemSel: ".slot-row", handleSel: ".grip", onMove: moveRow });
bindSortable($("#teacherList"), { itemSel: ".tcard", handleSel: ".grip", onMove: moveTeacher });

document.querySelector("[data-add-slot]")?.parentElement?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-add-slot]");
  if (b) addSlot(b.dataset.addSlot);
});
listen("#slotList", "change", (e) => {
  const sel = e.target.closest("select[data-kind]");
  if (!sel) return;
  const i = +sel.dataset.kind;
  state.kinds[i] = sel.value;
  if (sel.value !== "lesson" && !state.labels[i]) {
    state.labels[i] = sel.value === "meal" ? "Завтрак" : sel.value === "walk" ? "Прогулка" : "Перемена";
  }
  save(); renderControls(); renderSheet();
});
listen("#slotList", "click", (e) => {
  const b = e.target.closest("[data-del]");
  if (!b) return;
  const i = +b.dataset.del;
  if (state.rows <= 1) return toast("Хотя бы одна строка");
  state.kinds.splice(i, 1);
  state.labels.splice(i, 1);
  state.times.splice(i, 1);
  state.cells.forEach((g) => {
    g.splice(i, 1);
    while (g.length < MAX_ROWS) g.push(Array(7).fill(""));
  });
  state.rows--;
  save(); renderControls(); renderSheet();
});
listen("#infoChk", "change", (e) => {
  state.showInfo = e.target.checked;
  const infoFields = $("#infoFields");
  if (infoFields) infoFields.hidden = !state.showInfo;
  save(); renderSheet();
  if (state.showInfo) toast("Верхний блок включён — заполни инфо и учителей слева");
});
listen("#infoText", "input", (e) => {
  state.info = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
  save(); renderSheet();
});
onClick("#addTeacher", () => {
  state.teachers.push({ subject: "Предмет", names: "Имя Отчество", room: "каб. ", color: "#6366f1" });
  state.showInfo = true;
  const infoChk = $("#infoChk");
  if (infoChk) infoChk.checked = true;
  const infoFields = $("#infoFields");
  if (infoFields) infoFields.hidden = false;
  save(); renderTeachers(); renderSheet();
});
listen("#teacherList", "input", (e) => {
  const el = e.target.closest("[data-tf]");
  if (!el) return;
  const i = +el.dataset.i;
  if (!state.teachers[i]) return;
  state.teachers[i][el.dataset.tf] = el.value;
  save(); renderSheet();
});
listen("#teacherList", "click", (e) => {
  const b = e.target.closest("[data-tdel]");
  if (!b) return;
  state.teachers.splice(+b.dataset.tdel, 1);
  save(); renderTeachers(); renderSheet();
});

function bindCustom(id, key, transform = (v) => v) {
  listen(id, "input", (e) => {
    state.custom[key] = transform(e.target.value);
    save(); renderSheet();
  });
}
bindCustom("#cBg", "bg"); bindCustom("#cCard", "card"); bindCustom("#cInk", "ink"); bindCustom("#cAcc", "acc");
bindCustom("#cFont", "font"); bindCustom("#cRad", "rad", Number); bindCustom("#cPat", "pat"); bindCustom("#cEmoji", "emoji");
listen("#fmtSel", "change", (e) => { state.fmt = e.target.value; save(); renderSheet(); });
listen("#wmChk", "change", (e) => { state.wm = e.target.checked; save(); renderSheet(); });

function applyTemplate(kind, ask) {
  if (ask && !confirm("Заменить текущее расписание шаблоном?")) return;
  const keep = { theme: state.theme, custom: state.custom, wm: state.wm, fmt: state.fmt };
  if (kind === "empty") {
    const mode = state.mode;
    state = Object.assign(defaultState(mode), keep);
    state.cells = [emptyGrid(), emptyGrid()];
    state.kinds = Array.from({ length: 7 }, () => "lesson");
    state.labels = Array.from({ length: 7 }, () => "");
    state.rows = 7;
    state.times = (mode === "uni" ? UNI_TIMES : SCHOOL_TIMES).slice();
    state.showInfo = false;
    state.info = [];
    state.teachers = [];
    state.paints = [emptyGrid(), emptyGrid()];
    state.title = mode === "uni" ? "Моя группа" : "Мой класс";
  } else if (kind === "uni") {
    state = Object.assign(defaultState("uni"), keep);
  } else {
    state = Object.assign(defaultState("school"), keep);
  }
  save(); renderControls(); renderSheet();
  toast(kind === "empty" ? "Чистый лист" : "Шаблон подставлен — правь прямо в таблице");
}
listen("#tplChips", "click", (e) => {
  const b = e.target.closest("[data-tpl]");
  if (!b) return;
  applyTemplate(b.dataset.tpl, true);
});
onClick("#resetBtn", () => applyTemplate("empty", true));

const FMT_TARGET = { auto: 2, phone: 1170 / 430, story: 1080 / 540, post: 1080 / 540, a4: 2480 / 794 };
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "/js/vendor/html2canvas-pro.min.js";
    s.onload = res; s.onerror = () => rej(new Error("html2canvas load failed"));
    document.head.appendChild(s);
  });
}
async function renderCanvas() {
  await loadHtml2Canvas();
  if (isCompact()) renderSheet();
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
  document.activeElement?.blur?.();
  const keepPreview = document.body.classList.contains("preview-open");
  document.body.classList.add("capturing");
  sheet.style.transform = "none";
  sheet.classList.add("exporting");
  try {
    return await window.html2canvas(sheet, {
      scale: FMT_TARGET[state.fmt] || 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      onclone(doc) {
        doc.querySelectorAll(".grip").forEach((g) => g.remove());
        const clone = doc.getElementById("sheet");
        if (clone) {
          clone.style.overflow = "hidden";
          clone.style.opacity = "1";
          clone.style.transform = "none";
          clone.style.position = "relative";
        }
      }
    });
  } finally {
    sheet.classList.remove("exporting");
    document.body.classList.remove("capturing");
    if (keepPreview && isCompact()) {
      const port = $("#previewPort");
      if (port) port.appendChild(sheet);
      requestAnimationFrame(scalePreview);
    } else {
      sheetHome();
    }
  }
}
async function downloadPng() {
  const btns = [$("#dlBtn"), $("#dlBtn2"), $("#previewDl")];
  btns.forEach((b) => { b.disabled = true; });
  toast("Рисую картинку…");
  try {
    const canvas = await renderCanvas();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/png");
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const suffix = state.dual ? (state.activeGrid === 0 ? "-nedelya1" : "-nedelya2") : "";
    const themeFile = state.theme === "minecraft" ? "pixel" : state.theme === "potter" ? "academy" : state.theme;
    a.download = `raspisanie-${themeFile}${suffix}.png`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
    showDonateNudge();
    counterHit("download");
    metrikaGoal("download");
    markScheduleCreated("download");
  } catch (err) {
    console.error(err);
    toast("Не получилось. Проверь интернет и попробуй ещё раз");
  } finally {
    btns.forEach((b) => { b.disabled = false; });
  }
}
onClick("#dlBtn", downloadPng);
onClick("#dlBtn2", downloadPng);
function printSheet() {
  if (isCompact()) {
    closePreview(true);
    renderSheet();
    sheetHome();
  }
  let tag = document.getElementById("printPage");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "printPage";
    document.head.appendChild(tag);
  }
  const size = state.fmt === "a4" ? "A4 portrait" : "A4 landscape";
  tag.textContent = `@media print { @page { size: ${size}; margin: 6mm; } }`;
  window.print();
}
onClick("#printBtn", printSheet);
onClick("#printBtnTop", printSheet);

function bytesToB64url(bytes) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
async function encodeShare() {
  const json = JSON.stringify(state);
  const raw = new TextEncoder().encode(json);
  if (typeof CompressionStream === "function") {
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip"));
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    return "z." + bytesToB64url(buf);
  }
  return "p." + bytesToB64url(raw);
}
async function decodeShare(token) {
  const dot = token.indexOf(".");
  const kind = token.slice(0, dot);
  const bytes = b64urlToBytes(token.slice(dot + 1));
  let raw = bytes;
  if (kind === "z") {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    raw = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return JSON.parse(new TextDecoder().decode(raw));
}
function shareApiBase() {
  const h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:18765";
  return "";
}
async function saveShareRemote(payload) {
  const r = await fetch(`${shareApiBase()}/api/share`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error("save " + r.status);
  const j = await r.json();
  if (!j || !j.id) throw new Error("no id");
  return j.id;
}
async function loadShareRemote(id) {
  const r = await fetch(`${shareApiBase()}/api/share/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("load " + r.status);
  return r.json();
}
function applySharedState(shared) {
  const next = hydrateState(shared);
  if (!next) return false;
  state = next;
  save();
  openEditor({ keepUrl: true });
  toast("Расписание из ссылки загружено — теперь оно твоё");
  return true;
}
async function shareSchedule() {
  try {
    let url;
    try {
      const id = await saveShareRemote(state);
      url = `${location.origin}/s/${id}`;
      history.replaceState(null, "", `/s/${id}`);
    } catch (e) {
      console.warn("short share failed, fallback to hash", e);
      const token = await encodeShare();
      url = `${location.origin}/#s=${token}`;
    }
    counterHit("share");
    metrikaGoal("share");
    markScheduleCreated("share");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Моё расписание", text: "Смотри, какое расписание я собрал(а) в Расписалке:", url });
        return;
      } catch (err) { if (err.name === "AbortError") return; }
    }
    await navigator.clipboard.writeText(url);
    toast("Ссылка скопирована — кидай друзьям");
  } catch (err) {
    console.error(err);
    toast("Не вышло создать ссылку");
  }
}
onClick("#shareBtn", shareSchedule);
onClick("#shareBtn2", shareSchedule);

const DEMO_CELLS = [
  ["алгебра", "физика", "инглиш", "история", "физра"],
  ["русский", "алгебра", "биология", "инглиш", "общество"],
  ["физра", "химия", "геометрия", "литра", "музыка"],
  ["труд", "инглиш", "физика", "алгебра", "изо"]
];
function buildShowcase() {
  const wrap = $("#showcase");
  if (!wrap) return;
  THEMES.forEach((t) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "mini-card";
    let mini = `<div class="mini-clip"><div class="sheet th-${t.id}">`;
    if (t.decor) mini += `<div class="s-decor">${[...t.decor].slice(0, 3).map((e) => `<i>${e}</i>`).join("")}</div>`;
    mini += `<header class="s-head"><h2 class="s-title">7 «Б»</h2><div class="s-tagrow"><span class="s-tag">расписание</span></div><div class="s-sub">2026/27 учебный год</div></header>
      <div class="s-grid" style="grid-template-columns:52px repeat(5,1fr)">
      <div class="s-corner">урок</div>`;
    for (let d = 0; d < 5; d++) mini += `<div class="s-dayh">${DAY_NAMES[d]}</div>`;
    for (let r = 0; r < 4; r++) {
      mini += `<div class="s-num"><b>${r + 1}</b><span class="s-time">${SCHOOL_TIMES[r]}</span></div>`;
      for (let d = 0; d < 5; d++) {
        const val = DEMO_CELLS[r][d];
        mini += `<div class="s-cell cat-${subjectCat(val)}">${val}</div>`;
      }
    }
    mini += `</div></div></div><div class="mini-meta"><b>${t.name}</b><span>попробовать →</span></div>`;
    card.innerHTML = mini;
    card.onclick = () => {
      state.theme = t.id;
      save();
      openEditor();
    };
    wrap.appendChild(card);
  });
}

function openEditor(opts) {
  try {
    document.body.classList.add("mode-edit");
    const landing = $("#landing");
    if (landing) {
      landing.setAttribute("aria-hidden", "true");
      landing.inert = true;
    }
    if (!opts || !opts.keepUrl) history.replaceState(null, "", "#edit");
    syncCompact();
    renderControls();
    renderSheet();
    window.scrollTo(0, 0);
    metrikaGoal("editor_open");
  } catch (err) {
    console.error("openEditor", err);
    toast("Не получилось открыть редактор — обнови страницу");
  }
}
function openLanding() {
  closePreview(true);
  document.body.classList.remove("mode-edit");
  const landing = $("#landing");
  if (landing) {
    landing.removeAttribute("aria-hidden");
    landing.inert = false;
  }
  history.replaceState(null, "", "/");
  window.scrollTo(0, 0);
}
onClick("#backBtn", openLanding);
listen("#logoHome", "click", (e) => {
  e.preventDefault();
  openLanding();
});
document.querySelectorAll("[data-open-editor]").forEach((b) => { b.onclick = () => openEditor(); });

function donateHref() {
  return (CONFIG.donateUrl || "").trim();
}
function openDonate(e) {
  if (e) e.preventDefault();
  hideDonateNudge();
  metrikaGoal("donate_open");
  const url = donateHref();
  const go = $("#donateGo");
  if (url && go) {
    go.hidden = false;
    go.href = url;
    go.textContent = "Открыть страницу доната";
  } else if (go) {
    go.hidden = true;
  }
  const modal = $("#donateModal");
  if (modal) modal.hidden = false;
}
function bindDonateQr() {
  const img = $("#donateQr");
  const box = $("#donateQrBox");
  if (!img || !box) return;
  const ok = () => { box.hidden = false; };
  const fail = () => { box.hidden = true; };
  img.src = CONFIG.donateQr || "/img/donate-qr.png";
  img.addEventListener("load", () => { if (img.naturalWidth > 16) ok(); else fail(); });
  img.addEventListener("error", fail);
  if (img.complete) {
    if (img.naturalWidth > 16) ok();
    else fail();
  }
}
onClick("#donateClose", () => { const m = $("#donateModal"); if (m) m.hidden = true; });
listen("#donateModal", "click", (e) => {
  if (e.target.id === "donateModal") e.currentTarget.hidden = true;
});
let donateNudgeTimer;
function hideDonateNudge() {
  const el = $("#donateNudge");
  if (el) el.hidden = true;
  clearTimeout(donateNudgeTimer);
}
function showDonateNudge() {
  const el = $("#donateNudge");
  if (!el) return;
  el.hidden = false;
  clearTimeout(donateNudgeTimer);
  donateNudgeTimer = setTimeout(hideDonateNudge, 12000);
}
onClick("#donateNudgeClose", hideDonateNudge);
document.querySelectorAll("[data-donate]").forEach((b) => { b.addEventListener("click", openDonate); });
document.querySelectorAll("[data-thanks]").forEach((b) => { b.addEventListener("click", sayThanks); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.body.classList.contains("preview-open")) {
    closePreview();
    return;
  }
  const modal = $("#donateModal");
  if (modal && !modal.hidden) modal.hidden = true;
  hideDonateNudge();
});

function metrikaGoal(name, params) {
  const id = CONFIG.metrikaId;
  if (!id || !isProdHost()) return;
  try {
    if (typeof window.ym === "function") window.ym(id, "reachGoal", name, params);
  } catch {}
}

async function boot() {
  try {
    syncCompact();
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
    buildShowcase();
    bindDonateQr();

    const short = location.pathname.match(/^\/s\/([23456789abcdefghijkmnpqrstuvwxyz]{8,12})$/i);
    const m = location.hash.match(/^#s=(.+)$/);
    if (short) {
      try {
        const shared = await loadShareRemote(short[1].toLowerCase());
        if (!applySharedState(shared)) toast("Этой ссылки уже нет — собери расписание заново");
      } catch (e) {
        console.error("bad short link", e);
        toast("Не получилось открыть ссылку");
      }
    } else if (m) {
      try {
        const shared = await decodeShare(decodeURIComponent(m[1]));
        if (applySharedState(shared)) {
          try {
            const id = await saveShareRemote(state);
            history.replaceState(null, "", `/s/${id}`);
          } catch {}
        }
      } catch (e) { console.error("bad share link", e); }
    } else if (location.hash === "#edit") {
      openEditor();
    }
  } catch (err) {
    console.error("boot", err);
  }

  try {
    let visits = null;
    const cached = sessionStorage.getItem("rv");
    if (!cached) {
      visits = await counterHit("visits");
      if (visits) { try { sessionStorage.setItem("rv", String(visits)); } catch {} }
    } else {
      visits = Number(cached);
    }
    const created = await counterGet("created");
    if (created != null) setCreatedStat(created);
    else if ($("#statCreated")) $("#statCreated").textContent = "0";
    setVisitsStat(visits);
    const thanks = await counterGet("thanks");
    setThanksStat(thanks);
  } catch (err) {
    console.warn("stats", err);
  }
}
boot();
