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
function dayLabel(i) {
  const t = state && state.dayLabels && String(state.dayLabels[i] || "").trim();
  return t || DAY_NAMES[i];
}
function emojiChars(raw, max = 4) {
  const s = String(raw || "");
  let parts;
  try {
    parts = [...new Intl.Segmenter("ru", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  } catch {
    parts = [...s];
  }
  return parts.filter((ch) => ch.trim()).slice(0, max);
}
const SCHOOL_TIMES = ["8:30", "9:25", "10:20", "11:20", "12:20", "13:15", "14:10", "15:05", "16:00", "16:55"];
const UNI_TIMES = ["9:00", "10:40", "12:20", "14:30", "16:10", "17:50", "19:30", "21:00", "21:30", "22:00"];
const LS_KEY = "raspisalka-v4";
const UI_THEME_KEY = "raspisalka-ui-theme";
const SITE_THEME_COLOR = { dark: "#0a0c13", light: "#f3f5fb" };
const MAX_ROWS = 16;
const KIND_NAME = { lesson: "урок", break: "перемена", meal: "еда", walk: "прогулка" };
const LOGO_MARK = '<svg class="s-foot-logo" viewBox="22.765 101.148 231.971 72.043" width="48" height="15" aria-hidden="true" focusable="false"><path d="M 238.433 138.710 C 228.693 138.226 248.736 139.169 233.930 138.528 C 225.213 138.201 192.441 137.121 172.477 136.563 C 158.041 136.160 149.183 136.444 148.174 136.248 C 145.035 135.649 143.530 132.531 145.192 130.495 C 154.833 118.671 164.060 112.576 162.536 108.809 C 161.866 107.148 156.104 107.678 154.336 107.976 C 129.887 112.028 89.342 125.553 65.884 135.048 C 61.962 136.637 50.544 142.684 51.723 144.792 C 52.851 146.597 78.408 140.345 89.635 136.773 C 92.964 135.713 91.253 125.518 90.478 122.112 C 89.663 118.536 87.670 112.741 84.042 112.225 C 75.908 111.075 69.993 116.969 54.784 132.403 C 39.558 147.853 28.765 167.191 33.425 159.572"/></svg>';

const OWN_SUBJECTS = [
  "Русский язык", "Литература", "Алгебра", "Геометрия",
  "Английский", "История", "Обществознание", "География",
  "Физика", "Химия", "Биология", "Информатика",
  "Физра", "ИЗО", "Музыка", "Технология", "ОБЖ", "Классный час"
];
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
function normalizeMode(mode) {
  return mode === "uni" || mode === "own" ? mode : "school";
}
function slotWord(mode = state && state.mode) {
  return mode === "uni" ? "пара" : "урок";
}
function weekParity(idx) {
  return idx === 0 ? "чётная" : "нечётная";
}
function clampTypeScale(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 100;
  return Math.min(140, Math.max(85, Math.round(x)));
}
function isCaveatFont(themeId, custom) {
  if (themeId === "notebook") return true;
  if (themeId === "custom") return /caveat/i.test(String(custom && custom.font || ""));
  return false;
}
function defaultState(mode = "school") {
  mode = normalizeMode(mode);
  if (mode === "own") {
    return {
      v: 4,
      mode,
      theme: "minimal",
      title: "Моё расписание",
      sub: "",
      days: [1, 1, 1, 1, 1, 0, 0],
      rows: 7,
      times: SCHOOL_TIMES.slice(),
      kinds: Array.from({ length: 7 }, () => "lesson"),
      labels: Array.from({ length: 7 }, () => ""),
      dayLabels: ["", "", "", "", "", "", ""],
      dual: false,
      activeGrid: 0,
      cells: [emptyGrid(), emptyGrid()],
      showInfo: false,
      info: [],
      teachers: [],
      custom: {
        bg: "#101322", card: "#1c2136", ink: "#f2f4ff", acc: "#ffd166",
        font: "Manrope, sans-serif", rad: 16, typeScale: 100, pat: "", emoji: "", bgImage: ""
      },
      wm: true,
      fmt: "auto",
      paints: [emptyGrid(), emptyGrid()]
    };
  }
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
    dayLabels: ["", "", "", "", "", "", ""],
    dual: false,
    activeGrid: 0,
    cells: uni ? [fillLessons(UNI_DEMO, kinds), fillLessons(UNI_DEMO_B, kinds)] : [fillLessons(SCHOOL_DEMO, kinds), emptyGrid()],
    showInfo: !uni,
    info: uni ? [] : SCHOOL_INFO.slice(),
    teachers: uni ? [] : SCHOOL_TEACHERS.map((t) => Object.assign({}, t)),
    custom: {
      bg: "#101322", card: "#1c2136", ink: "#f2f4ff", acc: "#ffd166",
      font: "Manrope, sans-serif", rad: 16, typeScale: 100, pat: "", emoji: "", bgImage: ""
    },
    wm: true,
    fmt: "auto",
    paints: [emptyGrid(), emptyGrid()]
  };
}

let state = loadState();
function hydrateState(s) {
  if (!s || typeof s !== "object" || ![2, 3, 4].includes(s.v)) return null;
  const base = defaultState(s.mode);
  const merged = Object.assign(base, s, { v: 4, mode: normalizeMode(s.mode) });
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
  else merged.custom = Object.assign({}, base.custom, merged.custom);
  merged.custom.typeScale = clampTypeScale(merged.custom.typeScale);
  if (merged.custom.bgImage && !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(merged.custom.bgImage)) {
    merged.custom.bgImage = "";
  }
  if (merged.custom.bgImage && merged.custom.bgImage.length > 400000) merged.custom.bgImage = "";
  if (!Array.isArray(merged.dayLabels) || merged.dayLabels.length !== 7) {
    merged.dayLabels = ["", "", "", "", "", "", ""];
  } else {
    merged.dayLabels = merged.dayLabels.map((x) => String(x || "").slice(0, 24));
  }
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
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (err) {
    if (state.custom && state.custom.bgImage) {
      const img = state.custom.bgImage;
      state.custom.bgImage = "";
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)); toast("Фото большое для браузера — выбери поменьше"); } catch {}
      state.custom.bgImage = img;
    }
  }
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

async function fetchCounterUrl(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    const n = Number(j && j.value);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
async function counterFetch(kind, action) {
  const key = encodeURIComponent(action);
  const own = `${shareApiBase()}/api/stat/${kind}/${key}`;
  const n = await fetchCounterUrl(own, 2500);
  if (n != null) return n;
  return fetchCounterUrl(
    `https://abacus.jasoncameron.dev/${kind}/${encodeURIComponent(CONFIG.abacusNs)}/${key}`,
    4000
  );
}
async function counterHit(action) {
  if (!isProdHost()) {
    const n = await fetchCounterUrl(`${shareApiBase()}/api/stat/hit/${encodeURIComponent(action)}`, 1500);
    if (n != null) return n;
    return counterGet(action);
  }
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
  if (n == null || Number.isNaN(Number(n))) return;
  if (visitsEl) visitsEl.textContent = fmtCount(n);
  const created = $("#statCreated")?.textContent;
  const createdBit = created && created !== "…" && created !== "0" ? ` · ${created} расписаний` : "";
  if (foot) foot.textContent = `${fmtCount(n)} заходов${createdBit}`;
}
async function markScheduleCreated(source) {
  try {
    if (!sessionStorage.getItem("rm")) {
      sessionStorage.setItem("rm", "1");
      metrikaGoal("schedule_created", { source });
    }
  } catch {
    metrikaGoal("schedule_created", { source });
  }
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
const COMPACT_MQ = window.matchMedia("(max-width: 720px)");
function isCompact() { return COMPACT_MQ.matches; }
let editDay = 0;

function syncCompact() {
  const on = isCompact();
  document.body.classList.toggle("compact", on);
  document.querySelectorAll("#fmtSel option.fmt-extra").forEach((o) => { o.hidden = true; });
  if (state && (state.fmt === "phone" || state.fmt === "story" || state.fmt === "post")) {
    state.fmt = "auto";
    save();
    const sel = $("#fmtSel");
    if (sel) sel.value = "auto";
  }
  if (!on) closePreview(true);
}

function ensureEditDay() {
  const days = activeDayIdx();
  if (!days.length) { editDay = 0; return; }
  if (!days.includes(editDay)) editDay = days[0];
}

function resetSheetFit() {
  if (sheet) {
    sheet.style.transform = "";
    sheet.style.transformOrigin = "";
    sheet.style.marginBottom = "";
  }
  const wrap = $("#sheetFit");
  if (wrap) wrap.style.height = "";
}
function sheetHome() {
  const wrap = $("#sheetFit") || $(".stage");
  if (sheet && wrap && sheet.parentElement !== wrap) wrap.appendChild(sheet);
  resetSheetFit();
  scheduleFit();
}
function fitSheetToStage() {
  const wrap = $("#sheetFit");
  if (!sheet || !wrap) return;
  if (document.body.classList.contains("preview-open")) {
    scalePreview();
    return;
  }
  if (
    !document.body.classList.contains("mode-edit") ||
    document.body.classList.contains("capturing") ||
    document.body.classList.contains("printing") ||
    document.body.classList.contains("compact")
  ) {
    resetSheetFit();
    return;
  }
  sheet.style.transform = "none";
  wrap.style.height = "";
  const naturalW = sheet.offsetWidth;
  const naturalH = sheet.offsetHeight;
  if (!naturalW || !naturalH) return;
  const availW = Math.max(160, wrap.clientWidth - 32);
  const scale = Math.min(1, Math.max(0.2, availW / naturalW));
  if (scale >= 0.995) {
    sheet.style.transform = "";
    wrap.style.height = "";
    return;
  }
  sheet.style.transformOrigin = "top center";
  sheet.style.transform = `scale(${scale})`;
  const nextH = Math.ceil(naturalH * scale) + "px";
  if (wrap.style.height !== nextH) wrap.style.height = nextH;
}
let fitRaf = 0;
function scheduleFit() {
  cancelAnimationFrame(fitRaf);
  fitRaf = requestAnimationFrame(() => {
    fitSheetToStage();
    fitRaf = requestAnimationFrame(fitSheetToStage);
  });
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
function setDayEnabled(i, on) {
  const next = on ? 1 : 0;
  if ((state.days[i] ? 1 : 0) === next) return true;
  if (!next && activeDayIdx().length <= 1) {
    toast("Хотя бы один день оставь");
    return false;
  }
  state.days[i] = next;
  save();
  return true;
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
  const c = state.custom || {};
  const caveat = isCaveatFont(themeId, c);
  el.className = `sheet th-${th.id} fmt-${el === sheet ? state.fmt : "auto"}` +
    ((el === sheet && !state.wm) ? " no-wm" : "") +
    (caveat ? " font-caveat" : "");
  el.removeAttribute("style");
  let decor = th.decor;
  if (themeId === "custom") {
    el.style.setProperty("--s-zoom", String(clampTypeScale(c.typeScale) / 100));
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
    if (c.bgImage) {
      el.style.backgroundColor = c.bg;
      el.style.backgroundImage = `url("${c.bgImage}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
    } else if (c.pat) {
      el.classList.add(c.pat);
    } else {
      el.style.background = c.bg;
    }
    decor = c.emoji;
  }
  return decor;
}

function renderSheet() {
  if (!sheet) return;
  const days = activeDayIdx();
  const uni = state.mode === "uni";
  const decor = applyThemeTo(sheet, state.theme);
  const badge = state.dual
    ? `<span class="s-badge">${weekParity(state.activeGrid)}</span>` : "";

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
  for (const d of days) html += `<div class="s-dayh" contenteditable="true" spellcheck="false" data-day-label="${d}">${esc(dayLabel(d))}</div>`;
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
  html += `</div><footer class="s-foot">${LOGO_MARK}расписалка</footer>`;
  if (state.theme === "custom") {
    const chars = emojiChars(decor, 4);
    if (chars.length) html = `<div class="s-decor">${chars.map((e) => `<i>${esc(e)}</i>`).join("")}</div>` + html;
  }
  sheet.innerHTML = html;
  renderDayEditor();
  scheduleFit();
}

function renderDayEditor() {
  const root = dayEditor;
  if (!root) return;
  if (!isCompact() || !document.body.classList.contains("mode-edit")) {
    root.innerHTML = "";
    return;
  }
  const typing = root.contains(document.activeElement) &&
    document.activeElement.closest(".s-cell, .s-span, .s-time, .s-dayh, [data-bind]");
  if (typing) return;
  ensureEditDay();
  const d = editDay;
  const g = grid() || emptyGrid();
  const tabs = DAY_NAMES.map((name, i) => {
    const enabled = !!state.days[i];
    const active = enabled && i === d;
    const cls = `day-tab${enabled ? " on" : " off"}${active ? " active" : ""}`;
    return `<button type="button" class="${cls}" data-edit-day="${i}" title="${DAY_FULL[i]}">${esc(dayLabel(i))}</button>`;
  }).join("");
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
      <div class="s-dayh" contenteditable="true" spellcheck="false" data-day-label="${d}">${esc(dayLabel(d))}</div>
    </div>
    <div class="day-tabs">${tabs}</div>
    <div class="day-slots">${slots}</div>
    <p class="hint day-editor-hint">Серый день выключен — нажми, чтобы вернуть. Ещё раз по активному — скрыть. Предпросмотр покажет весь лист.</p>
  `;
}

function onEditorInput(e) {
  const el = e.target;
  if (el.dataset.bind) state[el.dataset.bind] = el.innerText.trim();
  else if (el.dataset.time !== undefined) state.times[+el.dataset.time] = el.innerText.trim();
  else if (el.dataset.span !== undefined) state.labels[+el.dataset.span] = el.innerText.trim();
  else if (el.dataset.dayLabel !== undefined) {
    if (!Array.isArray(state.dayLabels) || state.dayLabels.length !== 7) state.dayLabels = ["", "", "", "", "", "", ""];
    const i = +el.dataset.dayLabel;
    state.dayLabels[i] = el.innerText.replace(/\n+/g, " ").trim().slice(0, 24);
    document.querySelectorAll(`[data-edit-day="${i}"]`).forEach((b) => { b.textContent = dayLabel(i); });
  }
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
  if (!part && !e.target.dataset.bind && e.target.dataset.time === undefined && e.target.dataset.span === undefined && e.target.dataset.dayLabel === undefined) return;
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
  if (e.target.dataset.dayLabel !== undefined) {
    document.execCommand("insertText", false, text.replace(/\n+/g, " ").slice(0, 24));
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
  if (e.key === "Enter" && !e.shiftKey && (e.target.dataset.bind || e.target.dataset.time !== undefined || e.target.dataset.span !== undefined || e.target.dataset.dayLabel !== undefined)) {
    e.preventDefault();
    e.target.blur();
  }
}
function onEditorPointerDown(e) {
  const root = e.currentTarget;
  if (!paintBrush) return;
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
  }
}
function onEditorClick(e) {
  if (paintBrush) return;
  if (document.body.classList.contains("is-sorting")) return;
  const cell = e.target.closest?.(".s-cell");
  if (!cell || e.target.closest(".s-subj, .s-note, .grip")) return;
  cell.querySelector(".s-subj")?.focus();
}
function bindEditorRoot(root) {
  if (!root || root.dataset.edBound) return;
  root.dataset.edBound = "1";
  root.addEventListener("input", onEditorInput);
  root.addEventListener("paste", onEditorPaste);
  root.addEventListener("keydown", onEditorKeydown);
  root.addEventListener("click", onEditorClick);
  root.addEventListener("pointerdown", onEditorPointerDown, true);
}
bindEditorRoot(sheet);
bindEditorRoot(dayEditor);
dayEditor?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit-day]");
  if (!b || !dayEditor.contains(b)) return;
  const i = +b.dataset.editDay;
  if (!state.days[i]) {
    if (!setDayEnabled(i, true)) return;
    editDay = i;
    renderControls();
    renderSheet();
    return;
  }
  if (i === editDay) {
    if (!setDayEnabled(i, false)) return;
    renderControls();
    renderSheet();
    return;
  }
  editDay = i;
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
  else if (document.body.classList.contains("mode-edit")) scheduleFit();
});

function renderControls() {
  try {
  syncCompact();
  document.querySelectorAll("#modeSeg button").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === state.mode));
  const slotWordLabel = $("#slotWordLabel");
  if (slotWordLabel) slotWordLabel.textContent = state.mode === "uni" ? "пар" : "уроков";
  const rowsLabel = $("#rowsLabel");
  if (rowsLabel) rowsLabel.textContent = "Строки расписания";
  const chips = $("#dayChips");
  if (chips) {
  chips.innerHTML = "";
  DAY_NAMES.forEach((n, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (state.days[i] ? " on" : "");
    b.textContent = dayLabel(i);
    b.title = DAY_FULL[i];
    b.onclick = () => {
      if (!setDayEnabled(i, !state.days[i])) return;
      renderControls(); renderSheet();
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
  setVal("#cType", clampTypeScale(c.typeScale), "value");
  const typeVal = $("#cTypeVal");
  if (typeVal) typeVal.textContent = clampTypeScale(c.typeScale) + "%";
  setVal("#cPat", c.pat, "value"); setVal("#cEmoji", c.emoji, "value");
  const thumb = $("#cBgThumb");
  const clearBg = $("#cBgClear");
  if (thumb) {
    thumb.hidden = !c.bgImage;
    thumb.style.backgroundImage = c.bgImage ? `url("${c.bgImage}")` : "";
  }
  if (clearBg) clearBg.hidden = !c.bgImage;
  const patSel = $("#cPat");
  if (patSel) patSel.disabled = !!c.bgImage;
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
  renderSubjectTray();
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
  applyTemplate(b.dataset.mode, false);
});
listen("#dualChk", "change", (e) => {
  state.dual = e.target.checked;
  if (!state.dual) state.activeGrid = 0;
  save(); renderControls(); renderSheet();
  if (state.dual) toast("Вверху вкладки: чётная и нечётная");
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
    row.innerHTML = `<span class="grip" title="Перетащить" data-drag-row="${i}">⋮⋮</span><b>${i + 1}</b><span>${esc(state.times[i] || "")} · ${esc(kind === "lesson" ? slotWord() : (state.labels[i] || KIND_NAME[kind]))}</span>
      <select data-kind="${i}">
        <option value="lesson"${kind === "lesson" ? " selected" : ""}>${slotWord()}</option>
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

function swapLessonCells(a, b) {
  const r1 = +a.r, d1 = +a.d, r2 = +b.r, d2 = +b.d;
  if (!Number.isFinite(r1) || !Number.isFinite(d1) || !Number.isFinite(r2) || !Number.isFinite(d2)) return;
  if (r1 === r2 && d1 === d2) return;
  const kind1 = (state.kinds && state.kinds[r1]) || "lesson";
  const kind2 = (state.kinds && state.kinds[r2]) || "lesson";
  if (kind1 !== "lesson" || kind2 !== "lesson") return;
  const g = grid();
  const p = paintsGrid();
  if (!g) return;
  if (!g[r1]) g[r1] = Array(7).fill("");
  if (!g[r2]) g[r2] = Array(7).fill("");
  const tmp = g[r1][d1] || "";
  g[r1][d1] = g[r2][d2] || "";
  g[r2][d2] = tmp;
  if (!p[r1]) p[r1] = Array(7).fill("");
  if (!p[r2]) p[r2] = Array(7).fill("");
  const pt = p[r1][d1] || "";
  p[r1][d1] = p[r2][d2] || "";
  p[r2][d2] = pt;
  save();
  renderSheet();
}
function bindCellSwap() {
  const THRESH = 10;
  const HOLD = 380;
  let session = null;

  function liveCell(el) {
    if (!el || !el.closest) return null;
    const cell = el.closest(".s-cell[data-r][data-d]");
    if (!cell) return null;
    if (sheet && sheet.contains(cell)) return cell;
    if (dayEditor && dayEditor.contains(cell)) return cell;
    return null;
  }
  function cellFromPoint(x, y) {
    const stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
    for (const el of stack) {
      if (!el) continue;
      if (el.classList && el.classList.contains("drag-ghost")) continue;
      const cell = liveCell(el);
      if (cell) return cell;
    }
    return null;
  }
  function paintGhost(ghost, src) {
    const cs = getComputedStyle(src);
    ghost.style.background = cs.backgroundColor;
    ghost.style.color = cs.color;
    ghost.style.border = `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}`;
    ghost.style.borderRadius = cs.borderRadius;
    ghost.style.fontFamily = cs.fontFamily;
    ghost.style.fontSize = cs.fontSize;
    ghost.style.fontWeight = cs.fontWeight;
    ghost.style.boxShadow = cs.boxShadow;
    ghost.style.padding = cs.padding;
    ghost.style.display = "flex";
    ghost.style.flexDirection = "column";
    ghost.style.justifyContent = "center";
    ghost.style.alignItems = "center";
    ghost.style.textAlign = "center";
  }
  function endSession() {
    if (!session) return;
    if (session.timer) clearTimeout(session.timer);
    session.cell.classList.remove("is-drag", "is-lift");
    document.querySelectorAll(".s-cell.is-over").forEach((n) => n.classList.remove("is-over"));
    document.body.classList.remove("is-sorting");
    if (session.ghost) session.ghost.remove();
    try { session.cell.releasePointerCapture(session.pointerId); } catch (_) {}
    session = null;
  }

  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (paintBrush) return;
    if (document.body.classList.contains("capturing") || document.body.classList.contains("printing")) return;
    const cell = liveCell(e.target);
    if (!cell) return;
    if (e.target.closest(".grip")) return;
    if (cell.contains(document.activeElement) && document.activeElement.isContentEditable) return;
    const touch = e.pointerType === "touch" || e.pointerType === "pen";
    session = {
      pointerId: e.pointerId,
      cell,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      armed: !touch,
      ghost: null,
      ox: 0,
      oy: 0,
      timer: null,
      touch
    };
    if (touch) session.timer = setTimeout(() => {
      if (!session || session.started) return;
      session.armed = true;
      session.cell.classList.add("is-lift");
    }, HOLD);
  });
  window.addEventListener("pointermove", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    const dist = Math.hypot(e.clientX - session.startX, e.clientY - session.startY);
    if (!session.started) {
      if (session.touch && !session.armed) {
        if (dist > 8) endSession();
        return;
      }
      if (!session.armed || dist < THRESH) return;
      session.started = true;
      if (session.timer) { clearTimeout(session.timer); session.timer = null; }
      if (document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
      session.cell.classList.add("is-drag");
      session.cell.classList.remove("is-lift");
      document.body.classList.add("is-sorting");
      const ghost = session.cell.cloneNode(true);
      ghost.classList.add("drag-ghost");
      ghost.classList.remove("is-drag", "is-over", "is-lift");
      ghost.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
      const r = session.cell.getBoundingClientRect();
      ghost.style.width = r.width + "px";
      ghost.style.height = r.height + "px";
      ghost.style.left = r.left + "px";
      ghost.style.top = r.top + "px";
      session.ox = e.clientX - r.left;
      session.oy = e.clientY - r.top;
      paintGhost(ghost, session.cell);
      document.body.appendChild(ghost);
      session.ghost = ghost;
      try { session.cell.setPointerCapture(e.pointerId); } catch (_) {}
    }
    e.preventDefault();
    session.ghost.style.left = (e.clientX - session.ox) + "px";
    session.ghost.style.top = (e.clientY - session.oy) + "px";
    document.querySelectorAll(".s-cell.is-over").forEach((n) => n.classList.remove("is-over"));
    const over = cellFromPoint(e.clientX, e.clientY);
    if (over && over !== session.cell) over.classList.add("is-over");
  }, { passive: false });
  window.addEventListener("pointerup", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    const { cell, started } = session;
    const x = e.clientX, y = e.clientY;
    endSession();
    if (!started) return;
    const blockClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener("click", blockClick, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", blockClick, true), 80);
    const over = cellFromPoint(x, y);
    if (!over || over === cell) return;
    swapLessonCells(
      { r: cell.dataset.r, d: cell.dataset.d },
      { r: over.dataset.r, d: over.dataset.d }
    );
  });
  window.addEventListener("pointercancel", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    endSession();
  });
}
bindCellSwap();

const OWN_SUBJECTS_TRAY = OWN_SUBJECTS;
let trayPick = null;
function setTrayPick(name) {
  trayPick = name || null;
  document.body.classList.toggle("tray-pick", !!trayPick);
  document.querySelectorAll(".tray-chip").forEach((ch) => {
    ch.classList.toggle("on", !!(trayPick && ch.dataset.traySubj === trayPick));
  });
}
function renderSubjectTray() {
  const tray = $("#subjectTray");
  const list = $("#subjectTrayList");
  if (!tray || !list) return;
  const on = state.mode === "own" && document.body.classList.contains("mode-edit");
  tray.hidden = !on;
  if (!on) {
    setTrayPick(null);
    return;
  }
  list.innerHTML = OWN_SUBJECTS_TRAY.map((name) => {
    const cat = subjectCat(name);
    return `<button type="button" class="tray-chip s-cell cat-${cat}" data-tray-subj="${esc(name)}">${esc(name)}</button>`;
  }).join("");
  if (trayPick) setTrayPick(trayPick);
}
function fillEmptyCell(r, d, name) {
  const kind = (state.kinds && state.kinds[r]) || "lesson";
  if (kind !== "lesson") return false;
  const g = grid();
  if (!g || !name) return false;
  if (!g[r]) g[r] = Array(7).fill("");
  const cur = g[r][d] || "";
  if (subjectCat(cur) !== "empty") return false;
  g[r][d] = name;
  setPaint(r, d, "");
  save();
  renderSheet();
  return true;
}
function bindSubjectTray() {
  const tray = $("#subjectTray");
  if (!tray) return;
  const THRESH = 10;
  const HOLD = 320;
  let session = null;

  function liveCell(el) {
    if (!el || !el.closest) return null;
    const cell = el.closest(".s-cell[data-r][data-d]");
    if (!cell) return null;
    if (sheet && sheet.contains(cell) && getComputedStyle(sheet).pointerEvents === "none") return null;
    if (sheet && sheet.contains(cell)) return cell;
    if (dayEditor && dayEditor.contains(cell)) return cell;
    return null;
  }
  function cellFromPoint(x, y) {
    const stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
    for (const el of stack) {
      if (!el) continue;
      if (el.classList && el.classList.contains("drag-ghost")) continue;
      const cell = liveCell(el);
      if (cell) return cell;
    }
    return null;
  }
  function markEmptyTargets(on) {
    document.body.classList.toggle("tray-drag", on);
  }
  function endSession() {
    if (!session) return;
    if (session.timer) clearTimeout(session.timer);
    if (session.chip) session.chip.classList.remove("is-drag");
    document.querySelectorAll(".s-cell.is-over").forEach((n) => n.classList.remove("is-over"));
    document.body.classList.remove("is-sorting");
    markEmptyTargets(false);
    if (session.ghost) session.ghost.remove();
    try { session.chip.releasePointerCapture(session.pointerId); } catch (_) {}
    session = null;
  }

  tray.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (paintBrush) return;
    const chip = e.target.closest("[data-tray-subj]");
    if (!chip || !tray.contains(chip)) return;
    const touch = e.pointerType === "touch" || e.pointerType === "pen";
    session = {
      pointerId: e.pointerId,
      chip,
      name: chip.dataset.traySubj,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
      armed: !touch,
      ghost: null,
      ox: 0,
      oy: 0,
      timer: null,
      touch
    };
    if (touch) session.timer = setTimeout(() => {
      if (!session || session.started) return;
      session.armed = true;
      session.chip.classList.add("is-lift");
    }, HOLD);
  });
  window.addEventListener("pointermove", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    const dist = Math.hypot(e.clientX - session.startX, e.clientY - session.startY);
    if (!session.started) {
      if (session.touch && !session.armed) {
        if (dist > 8) endSession();
        return;
      }
      if (!session.armed || dist < THRESH) return;
      session.started = true;
      if (session.timer) { clearTimeout(session.timer); session.timer = null; }
      session.chip.classList.add("is-drag");
      session.chip.classList.remove("is-lift");
      document.body.classList.add("is-sorting");
      markEmptyTargets(true);
      const ghost = session.chip.cloneNode(true);
      ghost.classList.add("drag-ghost");
      ghost.classList.remove("is-drag", "is-over", "is-lift", "on");
      const r = session.chip.getBoundingClientRect();
      ghost.style.width = r.width + "px";
      ghost.style.height = r.height + "px";
      ghost.style.left = r.left + "px";
      ghost.style.top = r.top + "px";
      session.ox = e.clientX - r.left;
      session.oy = e.clientY - r.top;
      document.body.appendChild(ghost);
      session.ghost = ghost;
      try { session.chip.setPointerCapture(e.pointerId); } catch (_) {}
    }
    e.preventDefault();
    session.ghost.style.left = (e.clientX - session.ox) + "px";
    session.ghost.style.top = (e.clientY - session.oy) + "px";
    document.querySelectorAll(".s-cell.is-over").forEach((n) => n.classList.remove("is-over"));
    const over = cellFromPoint(e.clientX, e.clientY);
    if (over && over.classList.contains("cat-empty")) over.classList.add("is-over");
  }, { passive: false });
  window.addEventListener("pointerup", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    const { name, started } = session;
    const x = e.clientX, y = e.clientY;
    endSession();
    if (!started) return;
    const blockClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener("click", blockClick, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", blockClick, true), 80);
    const over = cellFromPoint(x, y);
    if (!over || !over.classList.contains("cat-empty")) return;
    fillEmptyCell(+over.dataset.r, +over.dataset.d, name);
    setTrayPick(null);
  });
  window.addEventListener("pointercancel", (e) => {
    if (!session || e.pointerId !== session.pointerId) return;
    endSession();
  });
  document.addEventListener("click", (e) => {
    if (paintBrush) return;
    const chip = e.target.closest?.("[data-tray-subj]");
    if (chip && tray.contains(chip)) {
      const name = chip.dataset.traySubj;
      setTrayPick(trayPick === name ? null : name);
      return;
    }
    if (!trayPick) return;
    const cell = liveCell(e.target);
    if (!cell) {
      if (!e.target.closest?.("#subjectTray")) setTrayPick(null);
      return;
    }
    if (fillEmptyCell(+cell.dataset.r, +cell.dataset.d, trayPick)) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTrayPick(null);
  }, true);
}
bindSubjectTray();

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
listen("#cType", "input", (e) => {
  state.custom.typeScale = clampTypeScale(e.target.value);
  e.target.value = state.custom.typeScale;
  const lab = $("#cTypeVal");
  if (lab) lab.textContent = state.custom.typeScale + "%";
  save(); renderSheet();
});
listen("#fmtSel", "change", (e) => { state.fmt = e.target.value; save(); renderSheet(); });
listen("#wmChk", "change", (e) => { state.wm = e.target.checked; save(); renderSheet(); });

function compressBgImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|jpg|png|webp|gif|bmp)$/i.test(file.type)) {
      reject(new Error("type"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1400;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) { reject(new Error("size")); return; }
      if (w > max || h > max) {
        const s = max / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const fill = (state.custom && state.custom.bg) || "#101322";
      const encode = (cw, ch, q) => {
        canvas.width = cw;
        canvas.height = ch;
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0, cw, ch);
        return canvas.toDataURL("image/jpeg", q);
      };
      let q = 0.72;
      let data = encode(w, h, q);
      while (data.length > 280000 && q > 0.42) {
        q -= 0.08;
        data = encode(w, h, q);
      }
      if (data.length > 280000) {
        const s2 = Math.sqrt(280000 / data.length);
        w = Math.max(420, Math.round(w * s2));
        h = Math.max(420, Math.round(h * s2));
        data = encode(w, h, 0.62);
      }
      if (data.length > 400000) { reject(new Error("heavy")); return; }
      resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("read"));
    };
    img.src = url;
  });
}
onClick("#cBgPick", () => $("#cBgFile")?.click());
listen("#cBgFile", "change", async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = await compressBgImage(file);
    state.theme = "custom";
    state.custom.bgImage = data;
    save();
    renderControls();
    renderSheet();
    toast("Фон поставлен");
  } catch (err) {
    toast(err && err.message === "heavy" ? "Картинка слишком тяжёлая — выбери поменьше" : "Нужна картинка JPG, PNG или WebP");
  }
});
onClick("#cBgClear", () => {
  if (!state.custom) return;
  state.custom.bgImage = "";
  save();
  renderControls();
  renderSheet();
});

function applyTemplate(kind, ask) {
  if (ask && !confirm("Заменить текущее расписание шаблоном?")) return;
  const keep = { theme: state.theme, custom: state.custom, wm: state.wm, fmt: state.fmt };
  if (Array.isArray(state.dayLabels) && state.dayLabels.length === 7) keep.dayLabels = state.dayLabels;
  if (kind === "empty") {
    const mode = normalizeMode(state.mode);
    state = Object.assign(defaultState(mode), keep);
    if (mode !== "own") {
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
    }
  } else {
    state = Object.assign(defaultState(kind), keep);
  }
  save(); renderControls(); renderSheet();
  toast(kind === "empty" || kind === "own" ? "Чистый лист" : "Пример подставлен — правь прямо в таблице");
}
onClick("#resetBtn", () => applyTemplate("empty", true));

const FMT_TARGET = { auto: 3, phone: 3, story: 3, post: 3, a4: 4, a5: 4 };
const SHEET_PAINT_PROPS = [
  "backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition",
  "backgroundRepeat", "backgroundClip", "webkitBackgroundClip", "color",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "outlineColor", "boxShadow", "textShadow", "webkitTextFillColor",
  "caretColor", "stroke", "fill"
];
let sheetPaintBackup = null;

function clipTextFillColor(cs) {
  const acc = (cs.getPropertyValue("--s-acc") || "").trim();
  if (acc && acc !== "transparent") return acc;
  const c = cs.color;
  if (c && c !== "transparent" && c !== "rgba(0, 0, 0, 0)") return c;
  return "#111111";
}
function isClipText(cs) {
  const clip = `${cs.backgroundClip || ""} ${cs.webkitBackgroundClip || ""} ${cs.getPropertyValue("-webkit-background-clip") || ""}`.toLowerCase();
  return clip.includes("text");
}
function bakeSheetPaint(root) {
  if (!root || sheetPaintBackup) return;
  const nodes = [root, ...root.querySelectorAll("*")];
  const saved = [];
  for (const el of nodes) {
    const prev = {};
    for (const p of SHEET_PAINT_PROPS) prev[p] = el.style[p];
    saved.push({ el, prev });
    const cs = getComputedStyle(el);
    if (isClipText(cs)) {
      const fill = clipTextFillColor(cs);
      el.style.backgroundImage = "none";
      el.style.backgroundColor = "transparent";
      el.style.backgroundClip = "border-box";
      el.style.webkitBackgroundClip = "border-box";
      el.style.color = fill;
      el.style.webkitTextFillColor = fill;
      continue;
    }
    el.style.backgroundColor = cs.backgroundColor;
    if (cs.backgroundImage && cs.backgroundImage !== "none") {
      el.style.backgroundImage = cs.backgroundImage;
      el.style.backgroundSize = cs.backgroundSize;
      el.style.backgroundPosition = cs.backgroundPosition;
      el.style.backgroundRepeat = cs.backgroundRepeat;
    }
    el.style.color = cs.color;
    el.style.borderTopColor = cs.borderTopColor;
    el.style.borderRightColor = cs.borderRightColor;
    el.style.borderBottomColor = cs.borderBottomColor;
    el.style.borderLeftColor = cs.borderLeftColor;
    if (cs.outlineColor && cs.outlineStyle !== "none") el.style.outlineColor = cs.outlineColor;
    if (cs.boxShadow && cs.boxShadow !== "none") el.style.boxShadow = cs.boxShadow;
    if (cs.textShadow && cs.textShadow !== "none") el.style.textShadow = cs.textShadow;
    if (cs.webkitTextFillColor) el.style.webkitTextFillColor = cs.webkitTextFillColor;
    if (el instanceof SVGElement) {
      if (cs.stroke && cs.stroke !== "none") el.style.stroke = cs.stroke;
      if (cs.fill) el.style.fill = cs.fill;
    }
  }
  sheetPaintBackup = saved;
}
function restoreSheetPaint() {
  if (!sheetPaintBackup) return;
  for (const { el, prev } of sheetPaintBackup) {
    if (!el) continue;
    for (const p of SHEET_PAINT_PROPS) el.style[p] = prev[p];
  }
  sheetPaintBackup = null;
}

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
  resetSheetFit();
  sheet.style.transform = "none";
  sheet.classList.add("exporting");
  bakeSheetPaint(sheet);
  try {
    const bg = getComputedStyle(sheet).backgroundColor;
    return await window.html2canvas(sheet, {
      scale: FMT_TARGET[state.fmt] || 3,
      backgroundColor: (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") ? bg : "#ffffff",
      useCORS: true,
      logging: false,
      imageSmoothing: true,
      imageSmoothingQuality: "high",
      windowWidth: Math.max(1400, window.innerWidth || 1400),
      scrollX: 0,
      scrollY: 0,
      onclone(doc) {
        doc.querySelectorAll(".grip").forEach((g) => g.remove());
        const clone = doc.getElementById("sheet");
        if (clone) {
          clone.style.overflow = "hidden";
          clone.style.opacity = "1";
          clone.style.transform = "none";
          clone.style.position = "relative";
          clone.style.left = "auto";
          clone.style.top = "auto";
          clone.style.zIndex = "1";
          const view = doc.defaultView;
          clone.querySelectorAll(".s-title").forEach((el) => {
            const cs = view ? view.getComputedStyle(el) : null;
            if (!cs) return;
            const transparent = cs.color === "transparent" || cs.color === "rgba(0, 0, 0, 0)";
            if (isClipText(cs) || (transparent && cs.backgroundImage && cs.backgroundImage !== "none")) {
              const fill = clipTextFillColor(cs);
              el.style.backgroundImage = "none";
              el.style.backgroundColor = "transparent";
              el.style.backgroundClip = "border-box";
              el.style.webkitBackgroundClip = "border-box";
              el.style.color = fill;
              el.style.webkitTextFillColor = fill;
            }
          });
        }
        const fit = doc.getElementById("sheetFit");
        if (fit) {
          fit.style.height = "auto";
          fit.style.overflow = "visible";
          fit.style.transform = "none";
        }
      }
    });
  } finally {
    restoreSheetPaint();
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
    const suffix = state.dual ? (state.activeGrid === 0 ? "-chetnaya" : "-nechetnaya") : "";
    const themeFile = state.theme === "minecraft" ? "pixel" : state.theme === "potter" ? "academy" : state.theme;
    const paper = state.fmt === "a5" ? "-a5" : state.fmt === "a4" ? "-a4" : "";
    a.download = `raspisanie-${themeFile}${suffix}${paper}.png`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
    showDonateNudge();
    counterHit("download");
    metrikaGoal("download", { theme: state.theme, fmt: state.fmt || "auto" });
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
  const size = state.fmt === "a4" ? "A4 portrait" : state.fmt === "a5" ? "A5 landscape" : "A4 landscape";
  tag.textContent = `@media print { @page { size: ${size}; margin: 4mm; } }`;
  document.body.classList.add("printing");
  resetSheetFit();
  bakeSheetPaint(sheet);
  metrikaGoal("print", { theme: state.theme, fmt: state.fmt || "auto" });
  markScheduleCreated("print");
  window.print();
}
onClick("#printBtn", printSheet);
onClick("#printBtnTop", printSheet);
window.addEventListener("beforeprint", () => {
  document.body.classList.add("printing");
  resetSheetFit();
  bakeSheetPaint(sheet);
});
window.addEventListener("afterprint", () => {
  document.body.classList.remove("printing");
  restoreSheetPaint();
  scheduleFit();
});

function bytesToB64url(bytes) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function stateForShare(withBg = true) {
  const s = JSON.parse(JSON.stringify(state));
  if (!withBg && s.custom) s.custom.bgImage = "";
  return s;
}
async function encodeShare() {
  const json = JSON.stringify(stateForShare(false));
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
function isAppleTouch() {
  const ua = navigator.userAgent || "";
  if (/iP(hone|ad|od)/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
async function shareSchedule() {
  try {
    const hadBg = !!(state.custom && state.custom.bgImage);
    let url;
    let photoInLink = false;
    try {
      const id = await saveShareRemote(stateForShare(true));
      url = `${location.origin}/s/${id}`;
      history.replaceState(null, "", `/s/${id}`);
      photoInLink = hadBg;
    } catch (e) {
      console.warn("short share failed, fallback to hash", e);
      const token = await encodeShare();
      url = `${location.origin}/#s=${token}`;
    }
    counterHit("share");
    metrikaGoal("share", { theme: state.theme });
    markScheduleCreated("share");
    const doneMsg = hadBg && !photoInLink
      ? "Ссылка без фото фона — не вышло залить картинку. Картинка останется у тебя и в PNG."
      : "Ссылка скопирована — кидай друзьям";
    const intro = "Смотри, какое расписание я собрал(а) в Расписалке:";
    if (navigator.share) {
      try {
        if (isAppleTouch()) {
          // iOS Copy из шаринга берёт только text и выкидывает url
          await navigator.share({ title: "Моё расписание", text: intro + " " + url });
        } else {
          await navigator.share({ title: "Моё расписание", text: intro, url });
        }
        if (hadBg && !photoInLink) toast(doneMsg);
        return;
      } catch (err) { if (err.name === "AbortError") return; }
    }
    await navigator.clipboard.writeText(url);
    toast(doneMsg);
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
    const keepUrl = !!(opts && opts.keepUrl);
    const prev = location.href;
    document.body.classList.add("mode-edit");
    const landing = $("#landing");
    if (landing) {
      landing.setAttribute("aria-hidden", "true");
      landing.inert = true;
    }
    if (!keepUrl) {
      const alreadyEdit = location.hash === "#edit";
      history.replaceState(null, "", "#edit");
      if (!alreadyEdit) metrikaHit(location.href, prev);
    }
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
  const prev = location.href;
  history.replaceState(null, "", "/");
  metrikaHit(location.href, prev);
  window.scrollTo(0, 0);
}
onClick("#backBtn", openLanding);
listen("#logoHome", "click", (e) => {
  e.preventDefault();
  openLanding();
});
document.querySelectorAll("[data-open-editor]").forEach((b) => { b.onclick = () => openEditor(); });

function isSiteLight() {
  return document.documentElement.classList.contains("site-light");
}
function applySiteTheme(light, persist) {
  const on = !!light;
  document.documentElement.classList.toggle("site-light", on);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", on ? SITE_THEME_COLOR.light : SITE_THEME_COLOR.dark);
  document.querySelectorAll("[data-site-theme]").forEach((btn) => {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Тёмная тема сайта" : "Светлая тема сайта");
    btn.title = on ? "Тёмная тема" : "Светлая тема";
  });
  if (persist !== false) {
    try { localStorage.setItem(UI_THEME_KEY, on ? "light" : "dark"); } catch {}
  }
}
document.querySelectorAll("[data-site-theme]").forEach((btn) => {
  btn.addEventListener("click", () => applySiteTheme(!isSiteLight()));
});
(function initSiteTheme() {
  let stored = false;
  try { stored = localStorage.getItem(UI_THEME_KEY) === "light"; } catch {}
  applySiteTheme(stored, false);
})();

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

function metrikaCall(method, ...args) {
  const id = CONFIG.metrikaId;
  if (!id || !isProdHost()) return;
  try {
    if (typeof window.ym === "function") window.ym(id, method, ...args);
  } catch {}
}
function metrikaGoal(name, params) {
  metrikaCall("reachGoal", name, params);
}
function metrikaHit(url, referer) {
  const opts = { title: document.title };
  if (referer) opts.referer = referer;
  metrikaCall("hit", url, opts);
}

async function boot() {
  try {
    syncCompact();
    const stage = $(".stage");
    if (stage && typeof ResizeObserver === "function") {
      new ResizeObserver(() => {
        if (document.body.classList.contains("mode-edit")) scheduleFit();
      }).observe(stage);
    }
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
    } else if (location.hash === "#phone") {
      history.replaceState(null, "", "/");
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
    setVisitsStat(visits);
    const thanks = await counterGet("thanks");
    setThanksStat(thanks);
  } catch (err) {
    console.warn("stats", err);
  }
}
const PW_SCHOOL_SUBJ = [
  "Русский язык", "Литература", "Алгебра", "Геометрия", "Английский", "История",
  "Обществознание", "География", "Физика", "Химия", "Биология", "Информатика",
  "Физра", "ИЗО", "Музыка", "Технология", "ОБЖ", "Классный час", "Разговоры о важном"
];
const PW_UNI_SUBJ = [
  "Матан", "Линал", "Прога", "Физика", "Английский", "Философия",
  "История", "Физра", "Экономика", "Право", "Дискретная математика", "Теория вероятностей"
];
let phoneWizard = null;
let pwHashLock = false;
let pwPick = null;

function pwCatalog(mode) {
  return mode === "uni" ? PW_UNI_SUBJ : PW_SCHOOL_SUBJ;
}
function pwHasLsDraft() {
  try {
    return !!(localStorage.getItem(LS_KEY) || localStorage.getItem("raspisalka-v3") || localStorage.getItem("raspisalka-v2"));
  } catch {
    return false;
  }
}
function pwParseMin(t) {
  const m = String(t || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return (+m[1]) * 60 + (+m[2]);
}
function pwMidTime(a, b) {
  const pa = pwParseMin(a), pb = pwParseMin(b);
  if (pa == null || pb == null || pb <= pa) return "12:00";
  const mid = Math.round((pa + pb) / 2);
  return Math.floor(mid / 60) + ":" + String(mid % 60).padStart(2, "0");
}
function pwBuildFrame(mode, lessonN, pauses) {
  const n = Math.max(1, Math.min(MAX_ROWS, Number(lessonN) || 1));
  if (!pauses) {
    const src = mode === "uni" ? UNI_TIMES : SCHOOL_TIMES;
    return {
      rows: n,
      kinds: Array.from({ length: n }, () => "lesson"),
      labels: Array.from({ length: n }, () => ""),
      times: src.slice(0, n)
    };
  }
  if (mode === "school") {
    const kinds = [], labels = [], times = [];
    let lessons = 0;
    for (let i = 0; i < SCHOOL_KINDS.length && lessons < n && kinds.length < MAX_ROWS; i++) {
      const k = SCHOOL_KINDS[i];
      if (k === "lesson") {
        kinds.push("lesson");
        labels.push("");
        times.push(SCHOOL_SLOT_TIMES[i] || SCHOOL_TIMES[lessons] || "");
        lessons++;
      } else {
        kinds.push(k);
        labels.push(SCHOOL_LABELS[i] || KIND_NAME[k] || "");
        times.push(SCHOOL_SLOT_TIMES[i] || "");
      }
    }
    while (lessons < n && kinds.length < MAX_ROWS) {
      kinds.push("lesson");
      labels.push("");
      times.push(SCHOOL_TIMES[lessons] || "");
      lessons++;
    }
    return { rows: kinds.length, kinds, labels, times };
  }
  const src = mode === "uni" ? UNI_TIMES : SCHOOL_TIMES;
  const pauseLabel = mode === "uni" ? "Перерыв" : "Перемена";
  if (n === 1) {
    return { rows: 1, kinds: ["lesson"], labels: [""], times: [src[0] || ""] };
  }
  const first = Math.floor(n / 2);
  const kinds = [], labels = [], times = [];
  for (let i = 0; i < first; i++) {
    kinds.push("lesson"); labels.push(""); times.push(src[i] || "");
  }
  kinds.push("break");
  labels.push(pauseLabel);
  times.push(pwMidTime(src[first - 1], src[first]));
  for (let i = 0; i < n - first; i++) {
    kinds.push("lesson"); labels.push(""); times.push(src[first + i] || "");
  }
  return { rows: kinds.length, kinds, labels, times };
}
function pwMaxLessonN(mode, pauses) {
  for (let n = MAX_ROWS; n >= 1; n--) {
    if (pwBuildFrame(mode, n, pauses).rows <= MAX_ROWS) return n;
  }
  return 1;
}
function pwRemapCells(oldKinds, oldCells, newKinds) {
  const take = [];
  (oldKinds || []).forEach((k, r) => {
    if (k === "lesson") {
      take.push([
        ((oldCells[0] || [])[r] || []).slice(),
        ((oldCells[1] || [])[r] || []).slice()
      ]);
    }
  });
  const c0 = emptyGrid(), c1 = emptyGrid();
  let i = 0;
  (newKinds || []).forEach((k, r) => {
    if (k !== "lesson") return;
    const src = take[i++] || [Array(7).fill(""), Array(7).fill("")];
    c0[r] = (src[0] || []).concat(["", "", "", "", "", "", ""]).slice(0, 7);
    c1[r] = (src[1] || []).concat(["", "", "", "", "", "", ""]).slice(0, 7);
  });
  return [c0, c1];
}
function pwData() {
  return phoneWizard.committed ? state : phoneWizard.session;
}
function pwPersist() {
  if (phoneWizard && phoneWizard.committed) save();
}
function pwApplyFrame() {
  const s = pwData();
  const maxN = pwMaxLessonN(s.mode, s.pauses);
  if (s.lessonN > maxN) s.lessonN = maxN;
  if (s.lessonN < 1) s.lessonN = 1;
  const frame = pwBuildFrame(s.mode, s.lessonN, s.pauses);
  const nextCells = pwRemapCells(s.kinds, s.cells, frame.kinds);
  s.kinds = frame.kinds;
  s.labels = frame.labels;
  s.times = frame.times;
  s.rows = frame.rows;
  s.cells = nextCells;
  pwPersist();
}
function pwModeDefaults(mode) {
  mode = normalizeMode(mode);
  if (mode === "uni") return { days: [1, 1, 1, 1, 1, 1, 0], lessonN: 4, pauses: false, theme: "neon" };
  if (mode === "own") return { days: [1, 1, 1, 1, 1, 0, 0], lessonN: 7, pauses: false, theme: "minimal" };
  return { days: [1, 1, 1, 1, 1, 0, 0], lessonN: 7, pauses: true, theme: "y2k" };
}
function pwNewSession() {
  const d = pwModeDefaults("school");
  const frame = pwBuildFrame("school", d.lessonN, d.pauses);
  return {
    mode: "school",
    days: d.days.slice(),
    dual: false,
    activeGrid: 0,
    lessonN: d.lessonN,
    pauses: d.pauses,
    subjects: [],
    extraSubjects: [],
    theme: d.theme,
    kinds: frame.kinds,
    labels: frame.labels,
    times: frame.times,
    rows: frame.rows,
    cells: [emptyGrid(), emptyGrid()],
    editDay: 0
  };
}
function pwSetMode(mode) {
  const s = pwData();
  if (s.mode === mode) return;
  const d = pwModeDefaults(mode);
  s.mode = mode;
  s.days = d.days.slice();
  s.dual = false;
  s.activeGrid = 0;
  s.lessonN = d.lessonN;
  s.pauses = d.pauses;
  s.subjects = [];
  s.extraSubjects = [];
  s.cells = [emptyGrid(), emptyGrid()];
  s.editDay = 0;
  if (!phoneWizard.themeTouched) s.theme = d.theme;
  const frame = pwBuildFrame(mode, s.lessonN, s.pauses);
  s.kinds = frame.kinds;
  s.labels = frame.labels;
  s.times = frame.times;
  s.rows = frame.rows;
  pwPersist();
}
function pwSnapshot() {
  if (phoneWizard.committed) return state;
  const s = phoneWizard.session;
  const base = defaultState(s.mode);
  return {
    v: 4,
    mode: s.mode,
    theme: s.theme,
    title: base.title,
    sub: base.sub,
    days: s.days.slice(),
    rows: s.rows,
    times: s.times.slice(),
    kinds: s.kinds.slice(),
    labels: s.labels.slice(),
    dayLabels: ["", "", "", "", "", "", ""],
    dual: !!s.dual,
    activeGrid: s.dual ? s.activeGrid : 0,
    cells: s.cells,
    showInfo: false,
    info: [],
    teachers: [],
    custom: Object.assign({}, base.custom),
    wm: true,
    fmt: "auto",
    paints: [emptyGrid(), emptyGrid()]
  };
}
function pwFillSheet(el) {
  if (!el) return;
  const bak = state;
  state = pwSnapshot();
  try {
    const days = activeDayIdx();
    const decor = applyThemeTo(el, state.theme);
    const badge = state.dual ? `<span class="s-badge">${weekParity(state.activeGrid)}</span>` : "";
    let html = `
    <header class="s-head">
      <h2 class="s-title">${esc(state.title)}</h2>
      <div class="s-tagrow"><span class="s-tag">расписание</span>${badge}</div>
      <div class="s-sub">${esc(state.sub)}</div>
    </header>
    <div class="s-grid" style="--days:${days.length}">
      <div class="s-headrow">
        <div class="s-corner"></div>`;
    for (const d of days) html += `<div class="s-dayh">${esc(dayLabel(d))}</div>`;
    html += `</div>`;
    const g = grid() || emptyGrid();
    for (let r = 0; r < state.rows; r++) {
      const kind = (state.kinds && state.kinds[r]) || "lesson";
      const row = g[r] || [];
      html += `<div class="s-row">`;
      html += `<div class="s-num"><span class="s-time">${esc(state.times[r] || "")}</span></div>`;
      if (kind === "lesson") {
        for (const d of days) {
          const val = row[d] || "";
          const look = paintClassAndStyle(val, r, d);
          html += `<div class="${look.cls}"${look.style}><span class="s-subj">${esc(splitCell(val).subj)}</span></div>`;
        }
      } else {
        html += `<div class="s-span kind-${kind}">${esc(state.labels[r] || KIND_NAME[kind])}</div>`;
      }
      html += `</div>`;
    }
    html += `</div><footer class="s-foot">${LOGO_MARK}расписалка</footer>`;
    if (state.theme === "custom") {
      const chars = emojiChars(decor, 4);
      if (chars.length) html = `<div class="s-decor">${chars.map((e) => `<i>${esc(e)}</i>`).join("")}</div>` + html;
    }
    el.innerHTML = html;
    el.classList.add("exporting");
  } finally {
    state = bak;
  }
}
function pwScalePreview() {
  const port = $("#pwPreview");
  const el = phoneWizard && phoneWizard.committed && phoneWizard.phase === "result" ? sheet : $("#pwSheet");
  if (!port || !el || port.hidden) return;
  el.style.transform = "none";
  const wrap = port.parentElement;
  const availW = Math.max(80, (wrap && wrap.clientWidth) || port.clientWidth || 300);
  const availH = Math.max(80, (wrap && wrap.clientHeight) || port.clientHeight || 200);
  const sw = el.offsetWidth || 1123;
  const sh = el.offsetHeight || 400;
  const scale = Math.min(1, Math.max(0.12, Math.min(availW / sw, availH / sh)));
  el.style.transformOrigin = "top center";
  el.style.transform = `scale(${scale})`;
  port.style.width = Math.ceil(sw * scale) + "px";
  port.style.height = Math.ceil(sh * scale) + "px";
}
function pwAsk(text, buttons) {
  return new Promise((resolve) => {
    const box = $("#pwDialog");
    const act = $("#pwDialogActions");
    const p = $("#pwDialogText");
    if (!box || !act || !p) { resolve(buttons[buttons.length - 1]?.id); return; }
    p.textContent = text;
    act.innerHTML = "";
    buttons.forEach((b) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "btn" + (b.primary ? " primary" : "");
      el.textContent = b.label;
      el.onclick = () => { box.hidden = true; resolve(b.id); };
      act.appendChild(el);
    });
    box.hidden = false;
  });
}
function pwEnabledDays() {
  const days = pwData().days || [];
  return days.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
}
function pwEnsureDay() {
  const s = pwData();
  const days = pwEnabledDays();
  if (!days.length) { s.editDay = 0; return; }
  if (!days.includes(s.editDay)) s.editDay = days[0];
}
function pwDayHasSubject(d) {
  const s = pwData();
  const g = (s.cells[s.dual ? s.activeGrid : 0] || []);
  for (let r = 0; r < s.rows; r++) {
    if ((s.kinds[r] || "lesson") !== "lesson") continue;
    if (String((g[r] || [])[d] || "").trim()) return true;
  }
  return false;
}
function pwGridHasAny(gi) {
  const s = pwData();
  const g = s.cells[gi] || [];
  for (let r = 0; r < s.rows; r++) {
    if ((s.kinds[r] || "lesson") !== "lesson") continue;
    const row = g[r] || [];
    if (row.some((v) => String(v || "").trim())) return true;
  }
  return false;
}
function pwSetCell(r, d, name) {
  const s = pwData();
  if ((s.kinds[r] || "lesson") !== "lesson") return;
  const gi = s.dual ? s.activeGrid : 0;
  if (!s.cells[gi]) s.cells[gi] = emptyGrid();
  if (!s.cells[gi][r]) s.cells[gi][r] = Array(7).fill("");
  s.cells[gi][r][d] = name || "";
  pwPersist();
}
function pwSwapCells(r1, d1, r2, d2) {
  const s = pwData();
  if ((s.kinds[r1] || "lesson") !== "lesson" || (s.kinds[r2] || "lesson") !== "lesson") return;
  const gi = s.dual ? s.activeGrid : 0;
  const g = s.cells[gi];
  if (!g[r1]) g[r1] = Array(7).fill("");
  if (!g[r2]) g[r2] = Array(7).fill("");
  const tmp = g[r1][d1] || "";
  g[r1][d1] = g[r2][d2] || "";
  g[r2][d2] = tmp;
  pwPersist();
}
function pwSubjectOnGrid(name) {
  const s = pwData();
  for (const g of s.cells) {
    for (let r = 0; r < s.rows; r++) {
      if ((s.kinds[r] || "lesson") !== "lesson") continue;
      const row = g[r] || [];
      for (let d = 0; d < 7; d++) {
        if (splitCell(row[d]).subj === name) return true;
      }
    }
  }
  return false;
}
function pwClearSubjectCells(name) {
  const s = pwData();
  s.cells.forEach((g) => {
    for (let r = 0; r < s.rows; r++) {
      if ((s.kinds[r] || "lesson") !== "lesson") continue;
      if (!g[r]) continue;
      for (let d = 0; d < 7; d++) {
        if (splitCell(g[r][d]).subj === name) g[r][d] = "";
      }
    }
  });
  pwPersist();
}
function pwAddSubject(raw) {
  const name = String(raw || "").replace(/\s+/g, " ").trim();
  if (!name) return false;
  const s = pwData();
  if (!s.subjects.includes(name)) s.subjects.push(name);
  const cat = pwCatalog(s.mode);
  if (!cat.includes(name) && !s.extraSubjects.includes(name)) s.extraSubjects.push(name);
  pwPersist();
  return true;
}
function pwSetPick(name) {
  pwPick = name || null;
  $("#phoneWizard")?.classList.toggle("pw-pick", !!pwPick);
  document.querySelectorAll("#phoneWizard [data-pw-subj]").forEach((ch) => {
    ch.classList.toggle("on", !!(pwPick && ch.dataset.pwSubj === pwPick));
  });
}
function pwSlotWord() {
  const m = pwData().mode;
  if (m === "uni") return "пар";
  if (m === "own") return "строк";
  return "уроков";
}
function pwPauseLabel() {
  const m = pwData().mode;
  if (m === "uni") return "Перерыв между парами";
  if (m === "own") return "Перемены";
  return "Перемены и еда";
}
function pwPauseHint() {
  const s = pwData();
  if (s.mode === "uni") return s.pauses ? "Один перерыв посередине" : "Только пары";
  if (s.mode === "own") return s.pauses ? "Одна перемена посередине" : "Только занятия";
  return s.pauses ? "Завтрак, перемены и обед как в смене" : "Только уроки";
}
function pwModeHint() {
  const m = pwData().mode;
  if (m === "uni") return "Пары, есть суббота";
  if (m === "own") return "Пустая сетка — сам решаешь дни и строки";
  return "Уроки, пять дней, звонки как в школе";
}

function pwShowCustom(on) {
  const bar = $("#pwCustomBar");
  if (!bar) return;
  bar.hidden = !on;
  if (on) {
    const inp = $("#pwCustomInput");
    if (inp) { inp.value = ""; inp.focus(); }
  }
}
function pwCommitCustom() {
  const inp = $("#pwCustomInput");
  const ok = pwAddSubject(inp ? inp.value : "");
  pwShowCustom(false);
  if (ok) pwRender();
}

function pwMountResultSheet() {
  const port = $("#pwPreview");
  if (!sheet || !port) return;
  port.innerHTML = "";
  port.appendChild(sheet);
  sheet.classList.add("exporting");
  requestAnimationFrame(() => {
    pwScalePreview();
    requestAnimationFrame(pwScalePreview);
  });
}
function pwRestoreSheet() {
  if (!sheet) return;
  sheet.classList.remove("exporting");
  sheet.style.transform = "";
  sheetHome();
}

function pwRenderPreview() {
  const wrap = $("#pwPreviewWrap");
  const port = $("#pwPreview");
  const el = $("#pwSheet");
  if (!wrap || !port || !el) return;
  wrap.hidden = false;
  if (phoneWizard.committed && phoneWizard.phase === "result") {
    el.hidden = true;
    pwMountResultSheet();
    return;
  }
  el.hidden = false;
  if (sheet && port.contains(sheet)) pwRestoreSheet();
  if (!port.contains(el)) {
    port.innerHTML = "";
    port.appendChild(el);
  }
  pwFillSheet(el);
  requestAnimationFrame(() => {
    pwScalePreview();
    requestAnimationFrame(pwScalePreview);
  });
}

function pwChipHtml(name, extraCls) {
  const cat = subjectCat(name);
  return `<button type="button" class="pw-chip s-cell cat-${cat}${extraCls || ""}" data-pw-subj="${esc(name)}">${esc(name)}</button>`;
}

function pwRender() {
  if (!phoneWizard) return;
  const root = $("#phoneWizard");
  if (!root) return;
  const step = phoneWizard.step;
  const phase = phoneWizard.phase || "steps";
  const head = $("#pwHead");
  const q = $("#pwQuestion");
  const lead = $("#pwLead");
  const body = $("#pwBody");
  const layout = $("#pwLayout");
  const result = $("#pwResult");
  const preview = $("#pwPreviewWrap");
  const foot = $("#pwFoot");
  const next = $("#pwNext");
  const back = $("#pwBack");
  if (head) head.hidden = phase === "result";
  if (foot) foot.hidden = phase === "result";
  if (result) result.hidden = phase !== "result";
  if (layout) layout.hidden = !(phase === "steps" && step === 4);
  if (preview) preview.hidden = !(phase === "steps" && (step === 1 || step === 2 || step === 5) || phase === "result");
  body.classList.toggle("pw-grow", phase === "steps" && (step === 3 || step === 5));
  pwShowCustom(false);
  if (phase === "result") {
    if (q) q.hidden = true;
    if (lead) lead.hidden = true;
    body.innerHTML = "";
    pwRenderResult();
    return;
  }
  if (q) q.hidden = false;
  const dots = $("#pwDots");
  const stepN = $("#pwStepN");
  if (stepN) stepN.textContent = `${step} из 5`;
  if (dots) {
    dots.innerHTML = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("");
  }
  if (next) next.textContent = step === 5 ? "Готово" : "Далее";
  if (back) back.textContent = "Назад";
  let skip = $("#pwSkip");
  if (!skip && foot) {
    skip = document.createElement("p");
    skip.id = "pwSkip";
    skip.className = "pw-skip";
    foot.parentNode.insertBefore(skip, foot);
  }
  if (skip) {
    const empty = step === 3 && !(pwData().subjects || []).length;
    skip.hidden = !(phase === "steps" && empty);
    skip.textContent = "Можно пропустить — добавишь на сетке";
  }
  if (step === 1) pwRenderStep1();
  else if (step === 2) pwRenderStep2();
  else if (step === 3) pwRenderStep3();
  else if (step === 4) pwRenderStep4();
  else pwRenderStep5();
}

function pwRenderStep1() {
  $("#pwQuestion").textContent = "Какое расписание делаем?";
  const hint = pwModeHint();
  const lead = $("#pwLead");
  const draft = phoneWizard.hadDraft ? "Черновик на сайте не трогаем, пока не нажмёшь «Готово»." : "";
  lead.hidden = !draft;
  lead.textContent = draft;
  const mode = pwData().mode;
  $("#pwBody").innerHTML = `<div class="seg" id="pwModeSeg">
    <button type="button" data-pw-mode="school"${mode === "school" ? " class=\"active\"" : ""}>Школа</button>
    <button type="button" data-pw-mode="uni"${mode === "uni" ? " class=\"active\"" : ""}>Универ</button>
    <button type="button" data-pw-mode="own"${mode === "own" ? " class=\"active\"" : ""}>Свой</button>
  </div>
  <p class="pw-lead">${esc(hint)}</p>`;
  pwRenderPreview();
}
function pwRenderStep2() {
  const s = pwData();
  $("#pwQuestion").textContent = "Какие дни и сколько занятий?";
  const lead = $("#pwLead");
  lead.hidden = false;
  lead.textContent = pwPauseHint();
  const days = DAY_NAMES.map((n, i) =>
    `<button type="button" class="chip${s.days[i] ? " on" : ""}" data-pw-day="${i}">${n}</button>`).join("");
  $("#pwBody").innerHTML = `
    <div class="pw-days">${days}</div>
    <label class="check"><input type="checkbox" id="pwDual"${s.dual ? " checked" : ""} /> Две недели (чётная / нечётная)</label>
    <div class="pw-row">
      <span>${pwSlotWord()}</span>
      <div class="pw-stepper">
        <button type="button" id="pwMinus">−</button>
        <b id="pwLessonN">${s.lessonN}</b>
        <button type="button" id="pwPlus">+</button>
      </div>
    </div>
    <label class="check"><input type="checkbox" id="pwPauses"${s.pauses ? " checked" : ""} /> ${pwPauseLabel()}</label>`;
  pwRenderPreview();
}
function pwRenderStep3() {
  const s = pwData();
  $("#pwQuestion").textContent = "Какие предметы?";
  const lead = $("#pwLead");
  lead.hidden = !s.subjects.length;
  lead.textContent = s.subjects.length ? "" : "";
  lead.hidden = true;
  const yours = s.subjects.length
    ? s.subjects.map((n) => pwChipHtml(n, " on")).join("")
    : `<span class="pw-empty">Ткни предметы ниже</span>`;
  const cat = pwCatalog(s.mode).concat(s.extraSubjects);
  const catalog = cat.map((n) => pwChipHtml(n, s.subjects.includes(n) ? " on" : "")).join("");
  $("#pwBody").innerHTML = `
    <div class="pw-yours" id="pwYours">${yours}</div>
    <div class="pw-catalog" id="pwCatalog">${catalog}
      <button type="button" class="pw-chip add" id="pwAddOwn">+ свой</button>
    </div>`;
  $("#pwPreviewWrap").hidden = true;
  $("#pwLayout").hidden = true;
}
function pwRenderStep4() {
  $("#pwQuestion").textContent = "Расставь по дням";
  $("#pwLead").hidden = true;
  $("#pwBody").innerHTML = "";
  $("#pwPreviewWrap").hidden = true;
  const s = pwData();
  pwEnsureDay();
  const layout = $("#pwLayout");
  layout.hidden = false;
  const weeks = s.dual
    ? `<div class="pw-weeks">
        <button type="button" data-pw-grid="0"${s.activeGrid === 0 ? " class=\"active\"" : ""}>Чётная</button>
        <button type="button" data-pw-grid="1"${s.activeGrid === 1 ? " class=\"active\"" : ""}>Нечётная</button>
      </div>` : "";
  const tabs = pwEnabledDays().map((i) =>
    `<button type="button" data-pw-edit-day="${i}" class="${i === s.editDay ? "active" : ""}${pwDayHasSubject(i) ? " has" : ""}">${DAY_NAMES[i]}</button>`).join("");
  const d = s.editDay;
  const g = s.cells[s.dual ? s.activeGrid : 0] || emptyGrid();
  let slots = "";
  for (let r = 0; r < s.rows; r++) {
    const kind = s.kinds[r] || "lesson";
    const time = esc(s.times[r] || "");
    if (kind === "lesson") {
      const val = (g[r] || [])[d] || "";
      const cls = `s-cell cat-${subjectCat(val)}`;
      const subj = esc(splitCell(val).subj);
      slots += `<div class="pw-slot" data-row="${r}">
        <span class="pw-time">${time}</span>
        <div class="${cls}" data-r="${r}" data-d="${d}"><span class="s-subj">${subj}</span></div>
      </div>`;
    } else {
      slots += `<div class="pw-slot is-span" data-row="${r}">
        <span class="pw-time">${time}</span>
        <div class="s-span kind-${kind}">${esc(s.labels[r] || KIND_NAME[kind])}</div>
      </div>`;
    }
  }
  const pal = s.subjects.map((n) => pwChipHtml(n, pwPick === n ? " on" : "")).join("");
  layout.innerHTML = `${weeks}
    <div class="pw-day-tabs">${tabs}</div>
    <div class="pw-slots">${slots}</div>
    <div class="pw-palette">
      ${pal}
      <button type="button" class="pw-chip add" id="pwAddOwn">+</button>
    </div>`;
  if (!phoneWizard.layoutHint) {
    phoneWizard.layoutHint = true;
    toast("Нажми предмет, потом клетку");
  }
}
function pwRenderStep5() {
  const s = pwData();
  $("#pwQuestion").textContent = "Как будет выглядеть?";
  $("#pwLead").hidden = true;
  const tape = THEMES.map((t) =>
    `<button type="button" class="tbtn${s.theme === t.id ? " active" : ""}" data-pw-theme="${t.id}">
      <span class="nm">${t.name}</span>
      <span class="sw">${t.sw.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
    </button>`).join("");
  $("#pwBody").innerHTML = `<div class="pw-themes">${tape}</div>`;
  pwRenderPreview();
}
function pwRenderResult() {
  const box = $("#pwResult");
  if (!box) return;
  box.hidden = false;
  $("#pwPreviewWrap").hidden = false;
  box.innerHTML = `<div class="pw-result-actions">
    <button type="button" class="btn primary" id="pwDl">Скачать PNG</button>
    <button type="button" class="btn" id="pwShare">Ссылка</button>
    <button type="button" class="btn" id="pwFix">Поправить раскладку</button>
    <button type="button" class="btn" id="pwOpenEditor">Открыть в редакторе</button>
    <button type="button" class="btn ghost" id="pwHome">На главную</button>
  </div>`;
  pwRenderPreview();
}

async function pwMaybeCopyOdd() {
  if (!phoneWizard || phoneWizard.oddAsked) return;
  const s = pwData();
  if (!s.dual || s.activeGrid !== 1) return;
  if (!pwGridHasAny(0) || pwGridHasAny(1)) {
    phoneWizard.oddAsked = true;
    return;
  }
  phoneWizard.oddAsked = true;
  const ans = await pwAsk("Скопировать чётную неделю на нечётную?", [
    { id: "yes", label: "Да", primary: true },
    { id: "no", label: "Нет" }
  ]);
  if (ans === "yes") {
    s.cells[1] = JSON.parse(JSON.stringify(s.cells[0]));
    pwPersist();
    pwRender();
  }
}

function pwCommit() {
  const s = phoneWizard.session;
  const base = defaultState(s.mode);
  const next = Object.assign(base, {
    v: 4,
    mode: s.mode,
    days: s.days.slice(),
    dual: !!s.dual,
    activeGrid: s.dual ? s.activeGrid : 0,
    rows: s.rows,
    kinds: s.kinds.slice(),
    labels: s.labels.slice(),
    times: s.times.slice(),
    cells: JSON.parse(JSON.stringify(s.cells)),
    theme: s.theme,
    custom: Object.assign({}, base.custom),
    fmt: "auto",
    wm: true,
    title: base.title,
    sub: base.sub,
    showInfo: false,
    info: [],
    teachers: [],
    paints: [emptyGrid(), emptyGrid()]
  });
  state = next;
  save();
  phoneWizard.committed = true;
  phoneWizard.session = state;
  metrikaGoal("phone_wizard_done");
  markScheduleCreated("phone_wizard");
  renderSheet();
}

function pwPushHash() {
  if (location.hash === "#phone") return;
  pwHashLock = true;
  history.pushState({ phoneWizard: true }, "", "#phone");
  pwHashLock = false;
}
function pwClearHash() {
  pwHashLock = true;
  history.replaceState(null, "", "/");
  pwHashLock = false;
}

function pwOpen() {
  if (!isCompact()) {
    toast("На широком экране открой «Создать»");
    return;
  }
  if (phoneWizard) return;
  phoneWizard = {
    step: 1,
    phase: "steps",
    session: pwNewSession(),
    committed: false,
    themeTouched: false,
    oddAsked: false,
    layoutHint: false,
    hadDraft: pwHasLsDraft()
  };
  pwPick = null;
  const el = $("#phoneWizard");
  if (!el) return;
  el.hidden = false;
  document.body.classList.add("phone-wizard");
  const landing = $("#landing");
  if (landing) { landing.setAttribute("aria-hidden", "true"); landing.inert = true; }
  pwPushHash();
  metrikaGoal("phone_wizard_open");
  metrikaGoal("phone_wizard_step", { step: 1 });
  pwRender();
}
function pwCloseSilent() {
  const dlg = $("#pwDialog");
  if (dlg) dlg.hidden = true;
  pwSetPick(null);
  pwRestoreSheet();
  const el = $("#phoneWizard");
  if (el) el.hidden = true;
  document.body.classList.remove("phone-wizard");
  document.documentElement.style.removeProperty("--pw-kb");
  const landing = $("#landing");
  if (landing) {
    landing.removeAttribute("aria-hidden");
    landing.inert = false;
  }
  phoneWizard = null;
  pwClearHash();
  window.scrollTo(0, 0);
}
function pwCloseExit() {
  if (!phoneWizard) return;
  if (!phoneWizard.committed) metrikaGoal("phone_wizard_exit");
  pwCloseSilent();
}
async function pwCloseBtn() {
  if (!phoneWizard) return;
  if (phoneWizard.phase === "result") {
    pwCloseSilent();
    return;
  }
  if (phoneWizard.step === 1 && !phoneWizard.committed) {
    pwCloseExit();
    return;
  }
  const ans = await pwAsk("Сбросить эту сборку?", [
    { id: "yes", label: "Да", primary: true },
    { id: "no", label: "Нет" }
  ]);
  if (ans === "yes") pwCloseExit();
}
function pwGo(step) {
  if (!phoneWizard) return;
  phoneWizard.phase = "steps";
  phoneWizard.step = step;
  metrikaGoal("phone_wizard_step", { step });
  pwRender();
}
function pwBack() {
  if (!phoneWizard) return;
  if (phoneWizard.phase === "result") {
    pwGo(5);
    return;
  }
  if (phoneWizard.step <= 1) {
    pwCloseExit();
    return;
  }
  pwGo(phoneWizard.step - 1);
}
async function pwNext() {
  if (!phoneWizard) return;
  if (phoneWizard.step < 5) {
    pwGo(phoneWizard.step + 1);
    return;
  }
  if (!phoneWizard.committed) pwCommit();
  phoneWizard.phase = "result";
  pwRender();
}

function pwBind() {
  document.querySelectorAll("[data-open-phone-wizard]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      pwOpen();
    });
  });
  onClick("#pwBackTop", pwBack);
  onClick("#pwBack", pwBack);
  onClick("#pwClose", () => { pwCloseBtn(); });
  onClick("#pwNext", () => { pwNext(); });
  onClick("#pwCustomAdd", pwCommitCustom);
  listen("#pwCustomInput", "keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); pwCommitCustom(); }
  });
  listen("#phoneWizard", "click", async (e) => {
    if (!phoneWizard) return;
    const modeBtn = e.target.closest("[data-pw-mode]");
    if (modeBtn) {
      pwSetMode(modeBtn.dataset.pwMode);
      pwRender();
      return;
    }
    const dayBtn = e.target.closest("[data-pw-day]");
    if (dayBtn) {
      const i = +dayBtn.dataset.pwDay;
      const s = pwData();
      const on = !s.days[i];
      if (!on && pwEnabledDays().length <= 1) {
        toast("Хотя бы один день оставь");
        return;
      }
      s.days[i] = on ? 1 : 0;
      pwEnsureDay();
      pwPersist();
      pwRender();
      return;
    }
    if (e.target.id === "pwMinus" || e.target.id === "pwPlus") {
      const s = pwData();
      const maxN = pwMaxLessonN(s.mode, s.pauses);
      s.lessonN += e.target.id === "pwPlus" ? 1 : -1;
      s.lessonN = Math.max(1, Math.min(maxN, s.lessonN));
      pwApplyFrame();
      pwRender();
      return;
    }
    const addOwn = e.target.closest("#pwAddOwn");
    if (addOwn) {
      pwShowCustom(true);
      return;
    }
    const yours = e.target.closest("#pwYours [data-pw-subj]");
    if (yours && phoneWizard.step === 3) {
      const name = yours.dataset.pwSubj;
      const s = pwData();
      if (pwSubjectOnGrid(name)) {
        const ans = await pwAsk(`Убрать «${name}» с расписания?`, [
          { id: "cells", label: "С клеток тоже", primary: true },
          { id: "list", label: "Только из списка" },
          { id: "cancel", label: "Отмена" }
        ]);
        if (ans === "cancel") return;
        if (ans === "cells") pwClearSubjectCells(name);
      }
      s.subjects = s.subjects.filter((n) => n !== name);
      pwPersist();
      pwRender();
      return;
    }
    const catChip = e.target.closest("#pwCatalog [data-pw-subj]");
    if (catChip && phoneWizard.step === 3) {
      pwAddSubject(catChip.dataset.pwSubj);
      pwRender();
      return;
    }
    const themeBtn = e.target.closest("[data-pw-theme]");
    if (themeBtn) {
      pwData().theme = themeBtn.dataset.pwTheme;
      phoneWizard.themeTouched = true;
      pwPersist();
      pwRender();
      return;
    }
    const gridBtn = e.target.closest("[data-pw-grid]");
    if (gridBtn) {
      pwData().activeGrid = +gridBtn.dataset.pwGrid;
      pwPersist();
      pwRender();
      pwMaybeCopyOdd();
      return;
    }
    const editDay = e.target.closest("[data-pw-edit-day]");
    if (editDay) {
      pwData().editDay = +editDay.dataset.pwEditDay;
      pwRender();
      return;
    }
    if (e.target.id === "pwDl") {
      await downloadPng();
      if (phoneWizard && phoneWizard.phase === "result") pwMountResultSheet();
      return;
    }
    if (e.target.id === "pwShare") {
      await shareSchedule();
      return;
    }
    if (e.target.id === "pwFix") {
      pwGo(4);
      return;
    }
    if (e.target.id === "pwOpenEditor") {
      pwCloseSilent();
      openEditor();
      return;
    }
    if (e.target.id === "pwHome") {
      pwCloseSilent();
      return;
    }
  });
  listen("#phoneWizard", "change", (e) => {
    if (!phoneWizard) return;
    if (e.target.id === "pwDual") {
      const s = pwData();
      s.dual = e.target.checked;
      if (!s.dual) s.activeGrid = 0;
      pwPersist();
      pwRender();
      return;
    }
    if (e.target.id === "pwPauses") {
      const s = pwData();
      s.pauses = e.target.checked;
      pwApplyFrame();
      pwRender();
    }
  });

  const layoutRoot = $("#pwLayout");
  if (layoutRoot) {
    let pwSkipClick = false;
    layoutRoot.addEventListener("click", (e) => {
      if (pwSkipClick) return;
      if (!phoneWizard || phoneWizard.step !== 4) return;
      const chip = e.target.closest("[data-pw-subj]");
      if (chip && layoutRoot.contains(chip)) {
        const name = chip.dataset.pwSubj;
        pwSetPick(pwPick === name ? null : name);
        return;
      }
      const cell = e.target.closest(".s-cell[data-r][data-d]");
      if (!cell || !layoutRoot.contains(cell)) return;
      const r = +cell.dataset.r, d = +cell.dataset.d;
      const s = pwData();
      if ((s.kinds[r] || "lesson") !== "lesson") return;
      const gi = s.dual ? s.activeGrid : 0;
      const cur = ((s.cells[gi] || [])[r] || [])[d] || "";
      if (pwPick) {
        pwSetCell(r, d, pwPick);
        pwRender();
        pwSetPick(pwPick);
        return;
      }
      if (String(cur).trim()) {
        pwSetCell(r, d, "");
        pwRender();
      }
    });
    (function bindPwDrag() {
      const THRESH = 10;
      const HOLD = 320;
      let session = null;
      function cellFromPoint(x, y) {
        const stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
        for (const n of stack) {
          if (!n || n.classList.contains("drag-ghost")) continue;
          const cell = n.closest?.(".s-cell[data-r][data-d]");
          if (cell && layoutRoot.contains(cell)) return cell;
        }
        return null;
      }
      function end() {
        if (!session) return;
        if (session.timer) clearTimeout(session.timer);
        session.el.classList.remove("is-drag", "is-lift");
        document.querySelectorAll("#pwLayout .s-cell.is-over").forEach((n) => n.classList.remove("is-over"));
        document.body.classList.remove("is-sorting");
        if (session.ghost) session.ghost.remove();
        try { session.el.releasePointerCapture(session.pointerId); } catch (_) {}
        session = null;
      }
      layoutRoot.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || !phoneWizard || phoneWizard.step !== 4) return;
        const chip = e.target.closest("[data-pw-subj]");
        const cell = e.target.closest(".s-cell[data-r][data-d]");
        const el = chip || cell;
        if (!el || !layoutRoot.contains(el)) return;
        if (cell && (pwData().kinds[+cell.dataset.r] || "lesson") !== "lesson") return;
        if (cell) {
          const s = pwData();
          const gi = s.dual ? s.activeGrid : 0;
          const cur = ((s.cells[gi] || [])[+cell.dataset.r] || [])[+cell.dataset.d] || "";
          if (!String(cur).trim() && !chip) return;
        }
        const touch = e.pointerType === "touch" || e.pointerType === "pen";
        session = {
          pointerId: e.pointerId, el, chip: !!chip,
          name: chip ? chip.dataset.pwSubj : "",
          r: cell ? +cell.dataset.r : -1,
          d: cell ? +cell.dataset.d : -1,
          startX: e.clientX, startY: e.clientY,
          started: false, armed: !touch, ghost: null, ox: 0, oy: 0, timer: null, touch
        };
        if (touch) session.timer = setTimeout(() => {
          if (!session || session.started) return;
          session.armed = true;
          session.el.classList.add("is-lift");
        }, HOLD);
      });
      window.addEventListener("pointermove", (e) => {
        if (!session || e.pointerId !== session.pointerId) return;
        const dist = Math.hypot(e.clientX - session.startX, e.clientY - session.startY);
        if (!session.started) {
          if (session.touch && !session.armed) {
            if (dist > 8) end();
            return;
          }
          if (!session.armed || dist < THRESH) return;
          session.started = true;
          if (session.timer) { clearTimeout(session.timer); session.timer = null; }
          session.el.classList.add("is-drag");
          session.el.classList.remove("is-lift");
          document.body.classList.add("is-sorting");
          const ghost = session.el.cloneNode(true);
          ghost.classList.add("drag-ghost");
          ghost.classList.remove("is-drag", "is-over", "is-lift", "on");
          const r = session.el.getBoundingClientRect();
          ghost.style.width = r.width + "px";
          ghost.style.height = r.height + "px";
          ghost.style.left = r.left + "px";
          ghost.style.top = r.top + "px";
          session.ox = e.clientX - r.left;
          session.oy = e.clientY - r.top;
          document.body.appendChild(ghost);
          session.ghost = ghost;
          try { session.el.setPointerCapture(e.pointerId); } catch (_) {}
        }
        e.preventDefault();
        session.ghost.style.left = (e.clientX - session.ox) + "px";
        session.ghost.style.top = (e.clientY - session.oy) + "px";
        document.querySelectorAll("#pwLayout .s-cell.is-over").forEach((n) => n.classList.remove("is-over"));
        const over = cellFromPoint(e.clientX, e.clientY);
        if (over && over !== session.el) over.classList.add("is-over");
      }, { passive: false });
      window.addEventListener("pointerup", (e) => {
        if (!session || e.pointerId !== session.pointerId) return;
        const { started, chip, name, r, d } = session;
        const x = e.clientX, y = e.clientY;
        end();
        if (!started || !phoneWizard || phoneWizard.step !== 4) return;
        const over = cellFromPoint(x, y);
        if (!over) return;
        pwSkipClick = true;
        setTimeout(() => { pwSkipClick = false; }, 80);
        const r2 = +over.dataset.r, d2 = +over.dataset.d;
        if (chip) {
          pwSetCell(r2, d2, name);
          pwSetPick(name);
          pwRender();
          pwSetPick(name);
          return;
        }
        if (r >= 0 && !(r === r2 && d === d2)) {
          pwSwapCells(r, d, r2, d2);
          pwRender();
        }
      });
      window.addEventListener("pointercancel", (e) => {
        if (!session || e.pointerId !== session.pointerId) return;
        end();
      });
    })();
  }

  COMPACT_MQ.addEventListener("change", () => {
    if (phoneWizard && !isCompact()) {
      if (!phoneWizard.committed) metrikaGoal("phone_wizard_exit");
      pwCloseSilent();
      toast("На широком экране открой «Создать»");
    }
  });
  window.addEventListener("resize", () => {
    if (phoneWizard) pwScalePreview();
  });
  window.addEventListener("popstate", () => {
    if (pwHashLock) return;
    if (!phoneWizard) return;
    pwBack();
    if (phoneWizard) pwPushHash();
  });
  const vv = window.visualViewport;
  if (vv) {
    const syncKb = () => {
      if (!phoneWizard) return;
      const kb = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      document.documentElement.style.setProperty("--pw-kb", kb + "px");
    };
    vv.addEventListener("resize", syncKb);
    vv.addEventListener("scroll", syncKb);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !phoneWizard) return;
    if (!$("#pwDialog")?.hidden) {
      $("#pwDialog").hidden = true;
      return;
    }
    pwCloseBtn();
  });
}
pwBind();

boot();
