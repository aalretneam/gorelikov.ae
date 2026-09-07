#!/usr/bin/env node
"use strict";
import { createRequire } from "module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const cal = require("../site/js/calendar-ics.js");

const SCHOOL_KINDS = ["lesson","meal","lesson","break","lesson","break","lesson","break","lesson","meal","lesson","lesson"];
const SCHOOL_SLOT_TIMES = ["8:30","9:10","9:25","10:05","10:20","11:00","11:20","11:55","12:20","12:50","13:15","14:10"];

function emptyGrid() {
  return Array.from({ length: 16 }, () => Array(7).fill(""));
}

function schoolState(fill) {
  const cells = emptyGrid();
  const odd = emptyGrid();
  if (fill) {
    cells[0][0] = "Алгебра";
    odd[0][0] = "Геометрия";
  }
  return {
    title: "7Б",
    dual: false,
    days: [1, 1, 1, 1, 1, 0, 0],
    kinds: SCHOOL_KINDS.slice(),
    times: SCHOOL_SLOT_TIMES.slice(),
    cells: [cells, odd]
  };
}

function eventBlock(ics, summary) {
  const parts = ics.split("BEGIN:VEVENT");
  const hit = parts.find((p) => p.includes(`SUMMARY:${summary}`));
  assert.ok(hit, `нет события ${summary}`);
  return hit.split("END:VEVENT")[0];
}

{
  const st = schoolState(true);
  assert.equal(cal.lessonLength(st, 0, 45), 40);
  const { ics, count } = cal.generateICS(st, {
    startDate: "2026-09-07",
    duration: 45,
    timezone: "Europe/Moscow",
    reminder: 0,
    now: new Date("2026-09-07T12:00:00Z")
  });
  assert.equal(count, 1);
  assert.match(ics, /DTSTART;TZID=Europe\/Moscow:20260907T083000/);
  assert.match(ics, /DTEND;TZID=Europe\/Moscow:20260907T091000/);
  assert.doesNotMatch(ics, /DTEND;TZID=Europe\/Moscow:20260907T091500/);
  assert.match(ics, /BEGIN:VTIMEZONE/);
  assert.match(ics, /TZOFFSETTO:\+0300/);
  assert.match(ics, /TZNAME:MSK/);
}

{
  const st = schoolState(false);
  assert.equal(cal.hasLessons(st), false);
  const errors = cal.validate(st, { startDate: "2026-09-07" });
  assert.ok(errors.some((e) => /расставь предметы/i.test(e)));
  const { count } = cal.generateICS(st, { startDate: "2026-09-07", duration: 45 });
  assert.equal(count, 0);
}

{
  const st = schoolState(true);
  st.dual = true;
  const even = cal.generateICS(st, {
    startDate: "2026-01-12",
    duration: 45,
    timezone: "Europe/Moscow",
    reminder: 0,
    startParity: "even",
    now: new Date("2026-01-12T12:00:00Z")
  });
  assert.equal(even.count, 2);
  assert.match(even.ics, /INTERVAL=2/);
  const algEven = eventBlock(even.ics, "Алгебра");
  const geoEven = eventBlock(even.ics, "Геометрия");
  assert.match(algEven, /DTSTART;TZID=Europe\/Moscow:20260112T083000/);
  assert.match(geoEven, /DTSTART;TZID=Europe\/Moscow:20260119T083000/);

  const odd = cal.generateICS(st, {
    startDate: "2026-01-12",
    duration: 45,
    timezone: "Europe/Moscow",
    reminder: 0,
    startParity: "odd",
    now: new Date("2026-01-12T12:00:00Z")
  });
  const algOdd = eventBlock(odd.ics, "Алгебра");
  const geoOdd = eventBlock(odd.ics, "Геометрия");
  assert.match(algOdd, /DTSTART;TZID=Europe\/Moscow:20260119T083000/);
  assert.match(geoOdd, /DTSTART;TZID=Europe\/Moscow:20260112T083000/);
}

{
  const s = { kinds: SCHOOL_KINDS.slice() };
  cal.hydrateWizard(s);
  assert.equal(s.lessonN, 7);
  assert.notEqual(String(s.lessonN), "undefined");
  assert.equal(s.pauses, true);
  assert.deepEqual(s.subjects, []);
  assert.deepEqual(s.extraSubjects, []);
}

{
  const s = { kinds: ["lesson", "meal", "lesson"], lessonN: undefined };
  cal.hydrateWizard(s);
  assert.equal(s.lessonN, 2);
  assert.ok(Number(s.lessonN) > 0);
}

{
  const missing = {};
  cal.hydrateWizard(missing);
  assert.ok(Number(missing.lessonN) > 0);
  assert.notEqual(String(missing.lessonN), "undefined");
}

{
  assert.equal(cal.resolveTz("UTC"), "Europe/Moscow");
  assert.equal(cal.resolveTz("Etc/UTC"), "Europe/Moscow");
  assert.equal(cal.resolveTz("Asia/Yekaterinburg"), "Asia/Yekaterinburg");
}

console.log("ok calendar-ics");
