/** Local portrait of this person. Never sent. */

import { snapshot, type RoomId, type Trace } from "./trace";
import { openedList, type GateId } from "./memory";

const DWELL_KEY = "ag-dwell";
const PLAY_KEY = "ag-play";
const TOTAL_ROOMS = 6;

export type PlayMemory = {
  moves: number;
  won: boolean;
  lost: boolean;
  ms: number;
};

export type Dwell = Partial<Record<RoomId, number>>;

/** Baked-in “typical guest” from the site’s own rhythm — not a live average. */
const TYPICAL = {
  rooms: 2,
  ms: 95_000,
  clicks: 14,
  moves: 48,
  pauses: 3,
  returns: 1,
  first: "field" as GateId,
};

export function loadDwell(): Dwell {
  try {
    const raw = localStorage.getItem(DWELL_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Dwell;
  } catch {
    return {};
  }
}

export function addDwell(room: RoomId, ms: number) {
  if (ms < 80) return;
  const d = loadDwell();
  d[room] = (d[room] ?? 0) + ms;
  try {
    localStorage.setItem(DWELL_KEY, JSON.stringify(d));
  } catch {
    /* private */
  }
}

export function loadPlay(): PlayMemory | null {
  try {
    const raw = localStorage.getItem(PLAY_KEY);
    return raw ? (JSON.parse(raw) as PlayMemory) : null;
  } catch {
    return null;
  }
}

export function savePlay(p: PlayMemory) {
  try {
    localStorage.setItem(PLAY_KEY, JSON.stringify(p));
  } catch {
    /* private */
  }
}

export function roomsDone() {
  const ids: GateId[] = ["field", "mosaic", "machine", "want", "behind", "play"];
  const g = new Set(openedList());
  return ids.filter((id) => g.has(id)).length;
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function longestRoom(d: Dwell): { id: string; ms: number } {
  let id = "hub";
  let ms = 0;
  for (const [k, v] of Object.entries(d)) {
    if ((v ?? 0) > ms) {
      id = k;
      ms = v ?? 0;
    }
  }
  return { id, ms };
}

const ROOM_WORD: Record<string, string> = {
  hub: "лабиринт",
  field: "остаться",
  mosaic: "собрать",
  machine: "смотреть",
  want: "хотеть",
  behind: "быть",
  play: "играть",
  you: "ты",
};

export type Portrait = {
  id: string;
  done: number;
  total: number;
  time: string;
  ms: number;
  clicks: number;
  moves: number;
  pauses: number;
  returns: number;
  unique: boolean;
  first: string;
  rooms: GateId[];
  traits: string[];
  verdict: string;
  title: string;
};

export function portrait(trace: Trace = snapshot()): Portrait {
  const d = loadDwell();
  const play = loadPlay();
  const order = openedList();
  const done = roomsDone();
  const dwellMs = Object.values(d).reduce((a, b) => a + (b ?? 0), 0);
  const ms = Math.max(trace.ms, dwellMs);
  const long = longestRoom(d);
  const traits: string[] = [];
  let unique = false;

  const clickRate = ms > 4000 ? trace.clicks / (ms / 1000) : 0;
  const moveRate = ms > 4000 ? trace.moves / (ms / 1000) : 0;
  const waited = (d.hub ?? 0) > 200_000;
  const waitedAll = (d.hub ?? 0) > 270_000;
  const mosaicDeep = (d.mosaic ?? 0) > 90_000;
  const deathLong = (d.behind ?? 0) > 70_000;
  const looker = trace.clicks < 6 && ms > 80_000;
  const restless = clickRate > 0.35 && done >= 3;
  const still = trace.pauses >= 8 && moveRate < 0.08;
  const returned = trace.returns >= 4;
  const won = Boolean(play?.won);
  const lost = Boolean(play?.lost);
  const allSix = done >= 6;
  const first = order[0];
  const oddFirst = Boolean(first && first !== TYPICAL.first);
  const played = Boolean(play);
  const playLong = Boolean(play && play.moves > 40 && !won);

  if (won) {
    unique = true;
    traits.push("выиграл у машины в её собственной игре");
  }
  if (lost) traits.push("дошёл до края доски и увидел, что партия уже была сыграна");
  if (allSix) {
    unique = true;
    traits.push("прошёл все шесть комнат");
  }
  if (waitedAll) {
    unique = true;
    traits.push("дождался всех дверей лабиринта");
  } else if (waited) {
    unique = true;
    traits.push("дождался лабиринта, когда почти никто не ждёт");
  }
  if (looker) {
    unique = true;
    traits.push("смотрел дольше, чем трогал");
  }
  if (deathLong) {
    unique = true;
    traits.push("остался там, где говорят о смерти");
  }
  if (oddFirst) {
    unique = true;
    traits.push(`начал не с «остаться», а с «${ROOM_WORD[first] ?? first}»`);
  }
  if (played && order[0] === "play") {
    unique = true;
    traits.push("вошёл в игру раньше, чем в созерцание");
  }
  if (mosaicDeep) traits.push("собирал панно дольше обычного");
  if (still) traits.push("много пауз — не убегал от тишины");
  if (restless) traits.push("шёл быстро, почти не задерживаясь");
  if (returned) traits.push("возвращался в лабиринт снова и снова");
  if (playLong) traits.push("долго играл, не требуя победы");
  if (played && !won && !lost) traits.push("оставил партию незакрытой");

  const farFromTypical =
    Math.abs(done - TYPICAL.rooms) >= 2 ||
    ms > TYPICAL.ms * 2.4 ||
    ms < TYPICAL.ms * 0.25 ||
    trace.clicks > TYPICAL.clicks * 4 ||
    (looker && ms > 120_000) ||
    oddFirst ||
    won;

  if (farFromTypical) unique = true;

  let title = "как почти все";
  let verdict = `Ты прошёл ${done} из ${TOTAL_ROOMS}. Средний гость заходит в две комнаты, трогает четырнадцать раз и уходит, не дождавшись третьей двери. Ты пока близок к этому следу.`;

  if (won && looker) {
    title = "тот, кто смотрел и выиграл";
    verdict =
      "Ты почти не трогал стены — и всё равно выиграл у машины. Так почти никто не делает. Суперкомпьютер ждал щелчков. Ты дал ему взгляд. Заключение: ты не игрок. Ты свидетель, который умеет ходить.";
  } else if (won) {
    title = "редкий ход";
    verdict =
      "Почти никто не выигрывает пять в ряд у этой машины. Средний гость сдаёт партию или не заходит играть. Ты собрал линию там, где она уже считала поле закрытым. Заключение: ты не согласился с готовым концом.";
  } else if (allSix && waitedAll) {
    title = "тот, кто дождался";
    verdict =
      "Ты остался в лабиринте, пока не открылись все двери, и прошёл их. Средний человек уходит на второй минуте. Ты измерил время собой. Заключение: ты не искал выход. Ты искал полноту.";
  } else if (oddFirst && done >= 3) {
    title = "идущий против порядка дверей";
    verdict = `Первая комната большинства — «остаться». Твоя — «${ROOM_WORD[first] ?? first}». Лабиринт предлагает последовательность. Ты выбрал другую. Заключение: ты не читаешь карту, ты пишешь её.`;
  } else if (deathLong && done >= 3) {
    title = "стоящий спиной к будущему";
    verdict = `Дольше всего ты был в комнате «${ROOM_WORD[long.id] ?? long.id}». Если это «быть» — ты смотрел туда, куда другие не задерживаются. Средний гость касается смерти и возвращается. Ты остался. Заключение: ты уже знаешь, что часть пути позади.`;
  } else if (looker) {
    title = "тот, кто не вмешивался";
    verdict =
      "Кликов почти нет, а время есть. Обычный след — это рука. Твой — глаз. Машина записывает жесты. Тебя она едва слышала. Заключение: ты здесь был, не доказывая присутствие.";
  } else if (restless && done >= 3) {
    title = "тот, кто не застревает";
    verdict =
      "Ты собрал комнаты быстро, почти без пауз. Средний гость медлит в одной и не доходит до трёх. Ты наоборот. Заключение: ты ищешь не глубину одной стены, а карту.";
  } else if (mosaicDeep && done >= 3) {
    title = "собирающий";
    verdict =
      "Ты задержался в мозаике дольше, чем принято. Панно для большинства — картинка. Для тебя — труд. Заключение: ты не смотришь на целое, пока не сложишь куски.";
  } else if (done >= 3 && unique) {
    title = "не средний след";
    verdict = `Ты уже не похож на типичного гостя: ${traits.slice(0, 2).join("; ") || "другой ритм"}. Время ${fmt(ms)}, комнат ${done} из ${TOTAL_ROOMS}. Заключение: лабиринт заметил отклонение и оставил тебе это зеркало.`;
  } else if (done >= 3) {
    title = "три из шести";
    verdict = `Ты прошёл ${done} из ${TOTAL_ROOMS}. Этого достаточно, чтобы увидеть себя: ${fmt(ms)} внутри, ${trace.clicks} касаний, ${trace.pauses} пауз. Ты ещё внутри нормы — и уже не случайный. Заключение: продолжай, если хочешь стать исключением.`;
  }

  if (!traits.length) {
    traits.push("пока без резкого отклонения от среднего следа");
  }

  return {
    id: trace.id,
    done,
    total: TOTAL_ROOMS,
    time: fmt(ms),
    ms,
    clicks: trace.clicks,
    moves: trace.moves,
    pauses: trace.pauses,
    returns: trace.returns,
    unique,
    first: first ? ROOM_WORD[first] ?? first : "—",
    rooms: order,
    traits,
    verdict,
    title,
  };
}
