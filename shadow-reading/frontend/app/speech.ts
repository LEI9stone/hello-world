import { useEffect, useRef, useState } from "react";
export function chunks(text: string): string[] {
  const result: string[] = [];
  let rest = text;
  while (rest.length > 220) {
    let end = 220;
    const prefix = rest.slice(0, 220);
    const boundary = Math.max(
      prefix.lastIndexOf(". "),
      prefix.lastIndexOf("? "),
      prefix.lastIndexOf("! "),
      prefix.lastIndexOf("; "),
    );
    if (boundary > 60) end = boundary + 2;
    else {
      const space = prefix.lastIndexOf(" ");
      if (space > 60) end = space + 1;
    }
    if (end < rest.length && /[\uD800-\uDBFF]/.test(rest[end - 1])) end--;
    result.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  if (rest) result.push(rest);
  return result;
}
type Status = "idle" | "playing" | "paused" | "ended" | "error";
export function useSpeech(texts: string[]) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voiceChosen = useRef(false);
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState(0.85);
  const [loop, setLoop] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState(-1);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const machine = useRef({
    token: 0,
    index: -1,
    status: "idle" as Status,
    restart: false,
    utterance: null as SpeechSynthesisUtterance | null,
  });
  const settings = useRef({ voice, rate, loop, voices, texts });
  settings.current = { voice, rate, loop, voices, texts };
  function state(next: Status) {
    machine.current.status = next;
    setStatus(next);
  }
  function cancel() {
    machine.current.token++;
    machine.current.utterance = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  function stop() {
    cancel();
    machine.current.index = -1;
    machine.current.restart = false;
    setCurrent(-1);
    setError("");
    state("idle");
  }
  function speak(index: number) {
    cancel();
    const token = machine.current.token;
    const options = settings.current;
    const selected = options.voices.find((v) => v.voiceURI === options.voice);
    if (!selected) {
      setError("当前英语音色不可用，请选择音色后重试。");
      state("error");
      return;
    }
    machine.current.index = index;
    machine.current.restart = false;
    setCurrent(index);
    setError("");
    state("playing");
    const selectedVoice = selected;
    const parts = chunks(options.texts[index]);
    let part = 0;
    window.speechSynthesis.resume();
    function next() {
      if (token !== machine.current.token) return;
      const utterance = new SpeechSynthesisUtterance(parts[part]);
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
      utterance.rate = options.rate;
      machine.current.utterance = utterance;
      utterance.onerror = (e) => {
        if (token !== machine.current.token) return;
        cancel();
        machine.current.restart =
          document.visibilityState === "hidden" &&
          (e.error === "interrupted" || e.error === "canceled");
        setError(`朗读失败（${e.error}），可以从当前段重试。`);
        state("error");
      };
      utterance.onend = () => {
        if (
          token !== machine.current.token ||
          machine.current.status !== "playing"
        )
          return;
        part++;
        if (part < parts.length) {
          next();
          return;
        }
        if (index + 1 < settings.current.texts.length) {
          speak(index + 1);
        } else if (settings.current.loop) {
          speak(0);
        } else {
          machine.current.utterance = null;
          state("ended");
        }
      };
      window.speechSynthesis.speak(utterance);
    }
    if (parts.length) next();
    else {
      setError("当前朗读段落为空。");
      state("error");
    }
  }
  function pause() {
    if (machine.current.status !== "playing") return;
    window.speechSynthesis.pause();
    state("paused");
  }
  function resume() {
    if (machine.current.status !== "paused") return;
    if (machine.current.restart || !window.speechSynthesis.speaking) {
      machine.current.restart = false;
      speak(Math.max(0, machine.current.index));
    } else {
      state("playing");
      window.speechSynthesis.resume();
    }
  }
  function configure(nextVoice: string, nextRate: number) {
    if (nextVoice !== settings.current.voice) voiceChosen.current = true;
    settings.current = {
      ...settings.current,
      voice: nextVoice,
      rate: nextRate,
    };
    setVoice(nextVoice);
    setRate(nextRate);
    if (machine.current.status === "playing") speak(machine.current.index);
    else if (machine.current.status === "paused") {
      cancel();
      machine.current.restart = true;
    }
  }
  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (!ok) return;
    const synth = window.speechSynthesis;
    const refresh = () => {
      const list = synth
        .getVoices()
        .filter((v) => /^en(?:[-_]|$)/i.test(v.lang));
      setVoices(list);
      settings.current.voices = list;
      const preferred = list.find(
        (v) => v.name === "Samantha" && /^en[-_]US$/i.test(v.lang),
      );
      if (
        !list.some((v) => v.voiceURI === settings.current.voice) ||
        (!voiceChosen.current &&
          machine.current.status === "idle" &&
          preferred &&
          settings.current.voice !== preferred.voiceURI)
      ) {
        const selected = preferred || list.find((v) => v.default) || list[0];
        settings.current.voice = selected?.voiceURI || "";
        setVoice(settings.current.voice);
      }
      if (list.length) setLoaded(true);
    };
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    const timer = window.setTimeout(() => setLoaded(true), 2000);
    const visible = () => {
      if (document.visibilityState !== "visible") return;
      if (machine.current.status === "error" && machine.current.restart) {
        speak(Math.max(0, machine.current.index));
        return;
      }
      if (machine.current.status !== "playing") return;
      // 只恢复系统中断的播放，不覆盖用户主动暂停的状态。
      if (!synth.speaking) speak(Math.max(0, machine.current.index));
      else if (synth.paused) synth.resume();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearTimeout(timer);
      synth.removeEventListener("voiceschanged", refresh);
      document.removeEventListener("visibilitychange", visible);
      machine.current.token++;
      synth.cancel();
    };
  }, []);
  return {
    voices,
    voice,
    rate,
    loop,
    status,
    current,
    error,
    supported,
    loaded,
    setLoop,
    configure,
    stop,
    pause,
    resume,
    play: () =>
      speak(status === "error" ? Math.max(0, machine.current.index) : 0),
    playOnce: () => {
      settings.current.loop = false;
      setLoop(false);
      speak(0);
    },
    playLoop: () => {
      settings.current.loop = true;
      setLoop(true);
      speak(0);
    },
  };
}
