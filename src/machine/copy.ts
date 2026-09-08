export const copy = {
  boot: ["инициализация наблюдения", "калибровка присутствия", "готово"],
  headlineArrival: "машина создаёт мгновение.",
  doNot: "не прерывай...",
  orMaybe: "или....",
  scroll: "прокрути, чтобы вмешаться",
  observing: "ты наблюдаешь.",
  knows: "система знает.",
  presence: "твоё присутствие меняет результат.",
  trace: "каждый жест оставляет след.",
  oversight: "требуется надзор человека.",
  uncertain: "система достигла неопределённого состояния.",
  continue: "продолжить",
  thoughts: [
    "я ещё не знаю, что это.",
    "мне нравится это направление.",
    "мне продолжать?",
    "ты не ушёл.",
  ],
  mirrorA: "я создавал это не в одиночку.",
  mirrorB: "ты был частью этого.",
  thanks: "спасибо, что остался.",
  remembers: "машина помнит мгновение.",
  session: "сессия завершена",
  again: "начать снова",
  soundOff: "звук / выкл",
  soundOn: "звук / вкл",
};

export type StateName =
  | "boot"
  | "arrival"
  | "observation"
  | "interference"
  | "oversight"
  | "creation"
  | "mirror"
  | "trace"
  | "complete";
