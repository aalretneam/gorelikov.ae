"use strict";
(function (root) {
  const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
  const TZONES = [
    ["Europe/Kaliningrad", "Калининград (UTC+2)", "+0200", "EET"],
    ["Europe/Moscow", "Москва (UTC+3)", "+0300", "MSK"],
    ["Europe/Samara", "Самара (UTC+4)", "+0400", "SAMT"],
    ["Asia/Yekaterinburg", "Екатеринбург (UTC+5)", "+0500", "YEKT"],
    ["Asia/Omsk", "Омск (UTC+6)", "+0600", "OMST"],
    ["Asia/Krasnoyarsk", "Красноярск (UTC+7)", "+0700", "KRAT"],
    ["Asia/Irkutsk", "Иркутск (UTC+8)", "+0800", "IRKT"],
    ["Asia/Yakutsk", "Якутск (UTC+9)", "+0900", "YAKT"],
    ["Asia/Vladivostok", "Владивосток (UTC+10)", "+1000", "VLAT"],
    ["Asia/Magadan", "Магадан (UTC+11)", "+1100", "MAGT"],
    ["Asia/Kamchatka", "Камчатка (UTC+12)", "+1200", "PETT"]
  ];
  const TZ_MAP = Object.fromEntries(TZONES.map((row) => [row[0], row]));

  function pad(n) { return String(n).padStart(2, "0"); }
  function parseYmd(s) {
    const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { y: +m[1], m: +m[2], d: +m[3] };
  }
  function ymdInput(ymd) {
    return `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}`;
  }
  function weekdayMon0(ymd) {
    const js = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay();
    return js === 0 ? 6 : js - 1;
  }
  function addDays(ymd, n) {
    const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + n));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  function firstWeekdayOnOrAfter(start, dayIndex) {
    const w = weekdayMon0(start);
    let diff = dayIndex - w;
    if (diff < 0) diff += 7;
    return addDays(start, diff);
  }
  function parseHm(t) {
    const m = String(t || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return [8, 30];
    return [Math.min(23, +m[1]), Math.min(59, +m[2])];
  }
  function localStamp(ymd, hm) {
    return `${ymd.y}${pad(ymd.m)}${pad(ymd.d)}T${pad(hm[0])}${pad(hm[1])}00`;
  }
  function addMinutes(ymd, hm, minutes) {
    let total = hm[0] * 60 + hm[1] + Number(minutes || 0);
    let days = Math.floor(total / (24 * 60));
    total -= days * 24 * 60;
    if (total < 0) { total += 24 * 60; days -= 1; }
    return { ymd: addDays(ymd, days), hm: [Math.floor(total / 60), total % 60] };
  }
  function stampUTC(date) {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  }
  function compact(ymd) {
    return `${ymd.y}${pad(ymd.m)}${pad(ymd.d)}`;
  }
  function escapeICS(str) {
    return String(str || "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r\n/g, "\n")
      .replace(/\n/g, "\\n");
  }
  function foldLine(line) {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const bytes = enc.encode(line);
    if (bytes.length <= 75) return line;
    const parts = [];
    let i = 0;
    while (i < bytes.length) {
      const max = i === 0 ? 75 : 74;
      let end = Math.min(i + max, bytes.length);
      while (end > i && (bytes[end] & 0xc0) === 0x80) end--;
      if (end === i) end = Math.min(i + max, bytes.length);
      const chunk = dec.decode(bytes.slice(i, end));
      parts.push(i === 0 ? chunk : " " + chunk);
      i = end;
    }
    return parts.join("\r\n");
  }
  function splitCell(val) {
    const raw = String(val || "").replace(/\r/g, "");
    const i = raw.indexOf("\n");
    if (i < 0) return { subj: raw, note: "" };
    return { subj: raw.slice(0, i), note: raw.slice(i + 1).replace(/^\n+/, "") };
  }
  function cellEmpty(val) {
    const subj = splitCell(val).subj.trim();
    return !subj || subj === "—" || subj === "-" || subj === "+";
  }
  function hasLessons(st) {
    const grids = st.dual ? [0, 1] : [0];
    return grids.some((gi) => {
      const g = (st.cells && st.cells[gi]) || [];
      return (st.kinds || []).some((kind, r) => {
        if ((kind || "lesson") !== "lesson") return false;
        const row = g[r] || [];
        return row.some((c, d) => st.days[d] && !cellEmpty(c));
      });
    });
  }
  function lessonLength(st, slotIndex, duration) {
    const want = Math.max(5, Math.min(180, Number(duration) || 45));
    const times = st.times || [];
    const hm = parseHm(times[slotIndex]);
    const start = hm[0] * 60 + hm[1];
    for (let i = slotIndex + 1; i < times.length; i++) {
      const next = parseHm(times[i]);
      const nm = next[0] * 60 + next[1];
      if (nm > start) return Math.max(5, Math.min(want, nm - start));
    }
    return want;
  }
  function vtimezone(tz) {
    const row = TZ_MAP[tz] || TZ_MAP["Europe/Moscow"];
    const id = row[0];
    const off = row[2];
    const name = row[3];
    return [
      "BEGIN:VTIMEZONE",
      `TZID:${id}`,
      `X-LIC-LOCATION:${id}`,
      "BEGIN:STANDARD",
      `TZOFFSETFROM:${off}`,
      `TZOFFSETTO:${off}`,
      `TZNAME:${name}`,
      "DTSTART:19700101T000000",
      "END:STANDARD",
      "END:VTIMEZONE"
    ];
  }
  function resolveTz(id) {
    if (TZ_MAP[id]) return id;
    return "Europe/Moscow";
  }
  function nearestMonday(from) {
    const now = from || new Date();
    const ymd = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    return addDays(ymd, (7 - weekdayMon0(ymd)) % 7);
  }
  function hydrateWizard(s) {
    if (!s || typeof s !== "object") return s;
    const kinds = Array.isArray(s.kinds) ? s.kinds : [];
    if (!(Number(s.lessonN) > 0)) {
      const n = kinds.filter((k) => (k || "lesson") === "lesson").length;
      s.lessonN = Math.max(1, n || 8);
    } else {
      s.lessonN = Math.max(1, Math.min(16, Number(s.lessonN)));
    }
    if (typeof s.pauses !== "boolean") {
      s.pauses = kinds.some((k) => (k || "lesson") !== "lesson");
    }
    if (s.editDay == null || !Number.isFinite(Number(s.editDay))) s.editDay = 0;
    else s.editDay = Math.max(0, Math.min(6, Number(s.editDay)));
    if (!Array.isArray(s.extraSubjects)) s.extraSubjects = [];
    if (!Array.isArray(s.subjects)) s.subjects = [];
    return s;
  }
  function validate(st, options) {
    const errors = [];
    if (!options.startDate || !parseYmd(options.startDate)) errors.push("Укажи дату начала занятий");
    const start = parseYmd(options.startDate);
    const end = options.endDate ? parseYmd(options.endDate) : null;
    if (options.endDate && !end) errors.push("Дата окончания не похожа на дату");
    if (start && end && options.endDate < options.startDate) errors.push("Дата окончания раньше даты начала");
    if (!hasLessons(st)) errors.push("Сначала расставь предметы по дням — иначе в календаре нечего ставить");
    return errors;
  }
  function generateICS(st, options) {
    const start = parseYmd(options.startDate);
    if (!start) return { ics: "", count: 0 };
    const tz = resolveTz(options.timezone);
    const duration = options.duration;
    const reminder = options.reminder;
    const dtstamp = stampUTC(options.now || new Date());
    const until = options.endDate && parseYmd(options.endDate)
      ? `${compact(parseYmd(options.endDate))}T235959Z` : null;
    const calName = `${st.title || "Расписание"} · Расписание`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Raspisalka//gorelikov.ae//RU",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeICS(calName)}`,
      `X-WR-TIMEZONE:${tz}`,
      ...vtimezone(tz)
    ];
    const dual = !!st.dual;
    const startEven = options.startParity !== "odd";
    const grids = dual ? [0, 1] : [0];
    let count = 0;
    grids.forEach((gi) => {
      let gridStart = start;
      if (dual) {
        const gridEven = gi === 0;
        if (startEven !== gridEven) gridStart = addDays(start, 7);
      }
      (st.days || []).forEach((on, dayIndex) => {
        if (!on) return;
        const first = firstWeekdayOnOrAfter(gridStart, dayIndex);
        (st.kinds || []).forEach((kind, slotIndex) => {
          if ((kind || "lesson") !== "lesson") return;
          const g = (st.cells && st.cells[gi]) || [];
          const val = (g[slotIndex] || [])[dayIndex] || "";
          if (cellEmpty(val)) return;
          const parsed = splitCell(val);
          const hm = parseHm((st.times || [])[slotIndex]);
          const mins = lessonLength(st, slotIndex, duration);
          const endAt = addMinutes(first, hm, mins);
          const uid = `raspisalka-${gi}-${dayIndex}-${slotIndex}-${compact(first)}@gorelikov.ae`;
          let rrule = `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[dayIndex]}`;
          if (dual) rrule += ";INTERVAL=2";
          if (until) rrule += `;UNTIL=${until}`;
          lines.push("BEGIN:VEVENT");
          lines.push(`UID:${uid}`);
          lines.push(`DTSTAMP:${dtstamp}`);
          lines.push(`DTSTART;TZID=${tz}:${localStamp(first, hm)}`);
          lines.push(`DTEND;TZID=${tz}:${localStamp(endAt.ymd, endAt.hm)}`);
          lines.push(rrule);
          lines.push(`SUMMARY:${escapeICS(parsed.subj.trim())}`);
          if (parsed.note.trim()) lines.push(`LOCATION:${escapeICS(parsed.note.trim())}`);
          if (st.title) lines.push(`DESCRIPTION:${escapeICS(st.title)}\\ngorelikov.ae`);
          if (reminder > 0) {
            lines.push("BEGIN:VALARM");
            lines.push("ACTION:DISPLAY");
            lines.push(`TRIGGER:-PT${reminder}M`);
            lines.push(`DESCRIPTION:${escapeICS(parsed.subj.trim())} через ${reminder} мин`);
            lines.push("END:VALARM");
          }
          lines.push("END:VEVENT");
          count++;
        });
      });
    });
    lines.push("END:VCALENDAR");
    return { ics: lines.map(foldLine).join("\r\n") + "\r\n", count };
  }

  const api = {
    TZONES,
    parseYmd,
    ymdInput,
    weekdayMon0,
    nearestMonday,
    hasLessons,
    lessonLength,
    validate,
    generateICS,
    hydrateWizard,
    resolveTz
  };
  root.RaspisalkaCal = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
