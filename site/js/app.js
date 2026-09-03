"use strict";
const CONFIG = {
  site: "gorelikov.ae",
  abacusNs: "gorelikov.ae",
  donateUrl: "",
  donateEmail: "artem@gorelikov.ae",
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
    fmt: "auto"
  };
}

let state = loadState();
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY) || localStorage.getItem("raspisalka-v3") || localStorage.getItem("raspisalka-v2");
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s || ![2, 3, 4].includes(s.v)) return defaultState();
    const base = defaultState(s.mode || "school");
    const merged = Object.assign(base, s, { v: 4 });
    if (!Array.isArray(merged.cells) || merged.cells.length < 2) merged.cells = base.cells;
    merged.cells = merged.cells.map((g) => {
      const ng = emptyGrid();
      (g || []).forEach((row, r) => { if (r < MAX_ROWS) ng[r] = (row || []).concat(["","","","","","",""]).slice(0, 7); });
      return ng;
    });
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
    return merged;
  } catch { return defaultState(); }
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

const $ = (sel) => document.querySelector(sel);
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

async function counterHit(action) {
  if (!isProdHost()) return counterGet(action);
  try {
    const r = await fetch(`https://abacus.jasoncameron.dev/hit/${encodeURIComponent(CONFIG.abacusNs)}/${encodeURIComponent(action)}`, { cache: "no-store" });
    const j = await r.json();
    return Number(j.value) || 0;
  } catch { return null; }
}
async function counterGet(action) {
  try {
    const r = await fetch(`https://abacus.jasoncameron.dev/get/${encodeURIComponent(CONFIG.abacusNs)}/${encodeURIComponent(action)}`, { cache: "no-store" });
    const j = await r.json();
    return Number(j.value) || 0;
  } catch { return null; }
}
function setCreatedStat(n) {
  const el = $("#statCreated");
  if (!el || n == null || Number.isNaN(Number(n))) return;
  el.textContent = fmtCount(n);
}
function setVisitsStat(n) {
  if (!n) {
    $("#statVisits").textContent = "live";
    return;
  }
  $("#statVisits").textContent = fmtCount(n);
  const created = $("#statCreated")?.textContent;
  const createdBit = created && created !== "…" && created !== "0" ? ` · ${created} расписаний` : "";
  $("#statFooter").textContent = `${fmtCount(n)} заходов${createdBit}`;
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
function activeDayIdx() {
  return state.days.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
}
function grid() {
  return state.cells[state.dual ? state.activeGrid : 0];
}

function applyThemeTo(el, themeId) {
  const th = THEMES.find((t) => t.id === themeId) || THEMES[0];
  el.className = `sheet th-${themeId} fmt-${el === sheet ? state.fmt : "auto"}` + ((el === sheet && !state.wm) ? " no-wm" : "");
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
  const days = activeDayIdx();
  const uni = state.mode === "uni";
  const decor = applyThemeTo(sheet, state.theme);
  const badge = state.dual
    ? `<span class="s-badge">${state.activeGrid === 0 ? "числитель" : "знаменатель"}</span>` : "";
  const decorHtml = decor
    ? `<div class="s-decor">${[...decor].slice(0, 3).map((e) => `<i>${esc(e)}</i>`).join("")}</div>` : "";

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

  let html = decorHtml + `
    <header class="s-head">
      <div class="s-tagrow"><span class="s-tag">расписание</span>${badge}</div>
      <h2 class="s-title" contenteditable="true" spellcheck="false" data-bind="title">${esc(state.title)}</h2>
      <div class="s-sub" contenteditable="true" spellcheck="false" data-bind="sub">${esc(state.sub)}</div>
    </header>
    ${extra}
    <div class="s-grid" style="--days:${days.length}">
      <div class="s-headrow">
        <div class="s-corner">${uni ? "пара" : "урок"}</div>`;
  for (const d of days) html += `<div class="s-dayh">${DAY_NAMES[d]}</div>`;
  html += `</div>`;
  const g = grid();
  let lessonNo = 0;
  for (let r = 0; r < state.rows; r++) {
    const kind = (state.kinds && state.kinds[r]) || "lesson";
    html += `<div class="s-row" data-row="${r}">`;
    if (kind === "lesson") {
      lessonNo++;
      html += `<div class="s-num" data-drag-row="${r}"><span class="grip" title="Перетащить">⋮⋮</span><b>${lessonNo}</b><span class="s-time" contenteditable="true" spellcheck="false" data-time="${r}">${esc(state.times[r] || "")}</span></div>`;
      for (const d of days) {
        const val = g[r][d] || "";
        html += `<div class="s-cell cat-${subjectCat(val)}">${cellInnerHtml(val, r, d)}</div>`;
      }
    } else {
      const tag = kind === "meal" ? "еда" : kind === "walk" ? "прогулка" : "перемена";
      html += `<div class="s-num" data-drag-row="${r}"><span class="grip" title="Перетащить">⋮⋮</span><span class="mini">${tag}</span><span class="s-time" contenteditable="true" spellcheck="false" data-time="${r}">${esc(state.times[r] || "")}</span></div>`;
      html += `<div class="s-span kind-${kind}" contenteditable="true" spellcheck="false" data-span="${r}">${esc(state.labels[r] || KIND_NAME[kind])}</div>`;
    }
    html += `</div>`;
  }
  html += `</div><footer class="s-foot">✦ расписалка · ${CONFIG.site}</footer>`;
  sheet.innerHTML = html;
}

sheet.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.bind) state[el.dataset.bind] = el.innerText.trim();
  else if (el.dataset.time !== undefined) state.times[+el.dataset.time] = el.innerText.trim();
  else if (el.dataset.span !== undefined) state.labels[+el.dataset.span] = el.innerText.trim();
  else if (el.dataset.part && el.dataset.r !== undefined) {
    const cell = el.closest(".s-cell");
    const subj = cell.querySelector(".s-subj")?.innerText.replace(/\n+/g, " ") || "";
    const note = cell.querySelector(".s-note")?.innerText.replace(/\n+$/, "") || "";
    const val = joinCell(subj, note);
    grid()[+el.dataset.r][+el.dataset.d] = val;
    cell.className = "s-cell cat-" + subjectCat(val);
  }
  save();
});
sheet.addEventListener("paste", (e) => {
  const part = e.target.dataset && e.target.dataset.part;
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
});
sheet.addEventListener("keydown", (e) => {
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
});
sheet.addEventListener("pointerdown", (e) => {
  const cell = e.target.closest?.(".s-cell");
  if (!cell || e.target.closest(".s-subj, .s-note")) return;
  cell.querySelector(".s-subj")?.focus();
});

function renderControls() {
  document.querySelectorAll("#modeSeg button").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === state.mode));
  $("#rowsLabel").textContent = "Строки расписания";
  const chips = $("#dayChips");
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
  $("#rowCount").textContent = lessonCount();
  $("#dualChk").checked = !!state.dual;
  $("#weekTabs").classList.toggle("show", !!state.dual);
  document.querySelectorAll("#weekTabs button").forEach((b) =>
    b.classList.toggle("active", +b.dataset.g === state.activeGrid));
  const tg = $("#themeGrid");
  tg.innerHTML = "";
  THEMES.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tbtn" + (state.theme === t.id ? " active" : "");
    b.innerHTML = `<span class="nm">${t.name}</span><span class="sw">${t.sw.map((c) => `<i style="background:${c}"></i>`).join("")}</span>`;
    b.onclick = () => { state.theme = t.id; save(); renderControls(); renderSheet(); };
    tg.appendChild(b);
  });
  $("#customPanel").classList.toggle("show", state.theme === "custom");
  const c = state.custom;
  $("#cBg").value = c.bg; $("#cCard").value = c.card; $("#cInk").value = c.ink; $("#cAcc").value = c.acc;
  $("#cFont").value = c.font; $("#cRad").value = c.rad; $("#cPat").value = c.pat; $("#cEmoji").value = c.emoji;
  $("#fmtSel").value = state.fmt;
  $("#wmChk").checked = !!state.wm;
  const infoChk = $("#infoChk");
  infoChk.checked = !!state.showInfo;
  $("#infoFields").hidden = !state.showInfo;
  const infoText = $("#infoText");
  if (document.activeElement !== infoText) infoText.value = (state.info || []).join("\n");
  renderTeachers();
  renderSlots();
}

$("#modeSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.dataset.mode === state.mode) return;
  applyTemplate(b.dataset.mode === "uni" ? "uni" : "school", false);
});
$("#dualChk").addEventListener("change", (e) => {
  state.dual = e.target.checked;
  if (!state.dual) state.activeGrid = 0;
  save(); renderControls(); renderSheet();
  if (state.dual) toast("Вверху вкладки недель I и II");
});
$("#weekTabs").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  state.activeGrid = +b.dataset.g;
  save(); renderControls(); renderSheet();
});
$("#rowPlus").onclick = () => addSlot("lesson");
$("#rowMinus").onclick = () => {
  if (state.rows <= 1) return;
  state.rows--;
  save(); renderControls(); renderSheet();
};

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
bindSortable(sheet, { itemSel: ".s-row", handleSel: ".s-num", onMove: moveRow });
bindSortable($("#slotList"), { itemSel: ".slot-row", handleSel: ".grip", onMove: moveRow });
bindSortable($("#teacherList"), { itemSel: ".tcard", handleSel: ".grip", onMove: moveTeacher });

document.querySelector("[data-add-slot]").parentElement.addEventListener("click", (e) => {
  const b = e.target.closest("[data-add-slot]");
  if (b) addSlot(b.dataset.addSlot);
});
$("#slotList").addEventListener("change", (e) => {
  const sel = e.target.closest("select[data-kind]");
  if (!sel) return;
  const i = +sel.dataset.kind;
  state.kinds[i] = sel.value;
  if (sel.value !== "lesson" && !state.labels[i]) {
    state.labels[i] = sel.value === "meal" ? "Завтрак" : sel.value === "walk" ? "Прогулка" : "Перемена";
  }
  save(); renderControls(); renderSheet();
});
$("#slotList").addEventListener("click", (e) => {
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
$("#infoChk").addEventListener("change", (e) => {
  state.showInfo = e.target.checked;
  $("#infoFields").hidden = !state.showInfo;
  save(); renderSheet();
  if (state.showInfo) toast("Верхний блок включён — заполни инфо и учителей слева");
});
$("#infoText").addEventListener("input", (e) => {
  state.info = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
  save(); renderSheet();
});
$("#addTeacher").onclick = () => {
  state.teachers.push({ subject: "Предмет", names: "Имя Отчество", room: "каб. ", color: "#6366f1" });
  state.showInfo = true;
  $("#infoChk").checked = true;
  $("#infoFields").hidden = false;
  save(); renderTeachers(); renderSheet();
};
$("#teacherList").addEventListener("input", (e) => {
  const el = e.target.closest("[data-tf]");
  if (!el) return;
  const i = +el.dataset.i;
  if (!state.teachers[i]) return;
  state.teachers[i][el.dataset.tf] = el.value;
  save(); renderSheet();
});
$("#teacherList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tdel]");
  if (!b) return;
  state.teachers.splice(+b.dataset.tdel, 1);
  save(); renderTeachers(); renderSheet();
});

function bindCustom(id, key, transform = (v) => v) {
  $(id).addEventListener("input", (e) => {
    state.custom[key] = transform(e.target.value);
    save(); renderSheet();
  });
}
bindCustom("#cBg", "bg"); bindCustom("#cCard", "card"); bindCustom("#cInk", "ink"); bindCustom("#cAcc", "acc");
bindCustom("#cFont", "font"); bindCustom("#cRad", "rad", Number); bindCustom("#cPat", "pat"); bindCustom("#cEmoji", "emoji");
$("#fmtSel").addEventListener("change", (e) => { state.fmt = e.target.value; save(); renderSheet(); });
$("#wmChk").addEventListener("change", (e) => { state.wm = e.target.checked; save(); renderSheet(); });

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
    state.title = mode === "uni" ? "Моя группа" : "Мой класс";
  } else if (kind === "uni") {
    state = Object.assign(defaultState("uni"), keep);
  } else {
    state = Object.assign(defaultState("school"), keep);
  }
  save(); renderControls(); renderSheet();
  toast(kind === "empty" ? "Чистый лист" : "Шаблон подставлен — правь прямо в таблице");
}
$("#tplChips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tpl]");
  if (!b) return;
  applyTemplate(b.dataset.tpl, true);
});
$("#resetBtn").onclick = () => applyTemplate("empty", true);

const FMT_TARGET = { auto: 2, phone: 1170 / 430, story: 1080 / 540, post: 1080 / 540, a4: 2480 / 794 };
function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    s.onload = res; s.onerror = () => rej(new Error("html2canvas load failed"));
    document.head.appendChild(s);
  });
}
async function renderCanvas() {
  await loadHtml2Canvas();
  if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
  document.activeElement?.blur?.();
  sheet.classList.add("exporting");
  try {
    return await window.html2canvas(sheet, {
      scale: FMT_TARGET[state.fmt] || 2,
      backgroundColor: null,
      useCORS: true,
      logging: false
    });
  } finally {
    sheet.classList.remove("exporting");
  }
}
async function downloadPng() {
  const btns = [$("#dlBtn"), $("#dlBtn2")];
  btns.forEach((b) => { b.disabled = true; });
  toast("Рисую картинку…");
  try {
    const canvas = await renderCanvas();
    const a = document.createElement("a");
    const suffix = state.dual ? (state.activeGrid === 0 ? "-nedelya1" : "-nedelya2") : "";
    a.download = `raspisanie-${state.theme}${suffix}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    toast("Готово — картинка в загрузках");
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
async function copyPng() {
  toast("Копирую картинку…");
  try {
    const canvas = await renderCanvas();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("blob");
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } catch {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": Promise.resolve(blob) })]);
      }
      toast("Картинка в буфере — вставляй в Telegram");
      counterHit("download");
      metrikaGoal("download");
      markScheduleCreated("copy");
      return;
    }
    throw new Error("no clipboard");
  } catch (err) {
    console.error(err);
    toast("Этот браузер не даёт копировать картинку — скачаю файлом");
    downloadPng();
  }
}
$("#dlBtn").onclick = downloadPng;
$("#dlBtn2").onclick = downloadPng;
$("#copyBtn").onclick = copyPng;
$("#copyBtn2").onclick = copyPng;
$("#printBtn").onclick = () => {
  let tag = document.getElementById("printPage");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "printPage";
    document.head.appendChild(tag);
  }
  const size = state.fmt === "a4" ? "A4 portrait" : "A4 landscape";
  tag.textContent = `@media print { @page { size: ${size}; margin: 6mm; } }`;
  window.print();
};

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
  if (!shared || (shared.v !== 2 && shared.v !== 3 && shared.v !== 4)) return false;
  state = Object.assign(defaultState(shared.mode), shared, { v: 4 });
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
$("#shareBtn").onclick = shareSchedule;
$("#shareBtn2").onclick = shareSchedule;

const DEMO_CELLS = [
  ["алгебра", "физика", "инглиш", "история", "физра"],
  ["русский", "алгебра", "биология", "инглиш", "общество"],
  ["физра", "химия", "геометрия", "литра", "музыка"],
  ["труд", "инглиш", "физика", "алгебра", "изо"]
];
function buildShowcase() {
  const wrap = $("#showcase");
  THEMES.forEach((t) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "mini-card";
    let mini = `<div class="mini-clip"><div class="sheet th-${t.id}">`;
    if (t.decor) mini += `<div class="s-decor">${[...t.decor].slice(0, 3).map((e) => `<i>${e}</i>`).join("")}</div>`;
    mini += `<header class="s-head"><div class="s-tagrow"><span class="s-tag">расписание</span></div>
      <h2 class="s-title">7 «Б»</h2><div class="s-sub">2026/27 учебный год</div></header>
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
  document.body.classList.add("mode-edit");
  $("#landing").setAttribute("aria-hidden", "true");
  $("#landing").inert = true;
  if (!opts || !opts.keepUrl) history.replaceState(null, "", "#edit");
  renderControls(); renderSheet();
  window.scrollTo(0, 0);
  metrikaGoal("editor_open");
}
function openLanding() {
  document.body.classList.remove("mode-edit");
  $("#landing").removeAttribute("aria-hidden");
  $("#landing").inert = false;
  history.replaceState(null, "", "/");
  window.scrollTo(0, 0);
}
$("#backBtn").onclick = openLanding;
$("#logoHome").addEventListener("click", (e) => {
  e.preventDefault();
  openLanding();
});
document.querySelectorAll("[data-open-editor]").forEach((b) => { b.onclick = () => openEditor(); });

function donateHref() {
  return (CONFIG.donateUrl || "").trim();
}
function openDonate(e) {
  if (e) e.preventDefault();
  metrikaGoal("donate_open");
  const url = donateHref();
  const go = $("#donateGo");
  const mail = $("#donateMail");
  mail.href = `mailto:${CONFIG.donateEmail}?subject=${encodeURIComponent("Расписалка — донат")}`;
  if (url) {
    go.hidden = false;
    go.href = url;
    go.textContent = "Открыть страницу доната";
  } else {
    go.hidden = true;
  }
  $("#donateModal").hidden = false;
}
$("#donateClose").onclick = () => { $("#donateModal").hidden = true; };
$("#donateModal").addEventListener("click", (e) => {
  if (e.target.id === "donateModal") $("#donateModal").hidden = true;
});
document.querySelectorAll("[data-donate]").forEach((b) => { b.addEventListener("click", openDonate); });

function metrikaGoal(name, params) {
  const id = CONFIG.metrikaId;
  if (!id || !isProdHost()) return;
  try {
    if (typeof window.ym === "function") window.ym(id, "reachGoal", name, params);
  } catch {}
}

async function boot() {
  $("#year").textContent = new Date().getFullYear();
  buildShowcase();

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
  else $("#statCreated").textContent = "0";
  setVisitsStat(visits);
}
boot();
