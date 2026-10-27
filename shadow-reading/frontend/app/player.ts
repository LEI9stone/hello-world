import { useEffect, useRef, useState } from "react";
import { api } from "./api";

// 音色描述来自音频就绪状态接口，ready 表示该音色已生成多少段音频。
export type Voice = {
  id: string;
  label: string;
  ready: number;
};

type StatusResponse = { total: number; voices: Voice[] };

type Status = "idle" | "playing" | "paused" | "ended" | "error";

// 音频由服务端预生成，前端只负责按段落链式播放，并用媒体会话接管锁屏/后台控制。
export function usePlayer(options: {
  articleId: number;
  count: number;
  readable: boolean[];
  title: string;
  subtitle: string;
  album: string;
}) {
  const { articleId, count, readable, title, subtitle, album } = options;
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voice, setVoice] = useState("en-US-AriaNeural");
  const [rate, setRate] = useState(0.85);
  const [loop, setLoop] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState(-1);
  const [error, setError] = useState("");
  const [voicesError, setVoicesError] = useState("");
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const audio = useRef<HTMLAudioElement | null>(null);
  const ahead = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);
  const position = useRef(-1);
  const phase = useRef<Status>("idle");
  const pending = useRef(false);
  const picked = useRef(false);
  const statusRef = useRef<StatusResponse>({ total: 0, voices: [] });
  const settings = useRef({ voice, rate, loop, count, articleId, readable });
  settings.current = { voice, rate, loop, count, articleId, readable };

  // 代码段没有音频，朗读序列只走「可朗读」的块；current 仍是块序号，以便高亮与滚动对齐。
  function nextReadable(index: number) {
    for (let i = Math.max(0, index); i < settings.current.count; i++) {
      if (settings.current.readable[i]) return i;
    }
    return -1;
  }

  function prevReadable(index: number) {
    for (let i = Math.min(index, settings.current.count - 1); i >= 0; i--) {
      if (settings.current.readable[i]) return i;
    }
    return -1;
  }

  function phaseTo(next: Status) {
    phase.current = next;
    setStatus(next);
  }

  function source(index: number) {
    const { articleId, voice } = settings.current;
    return `/api/articles/${articleId}/audio/${index}?voice=${encodeURIComponent(voice)}`;
  }

  function session(state: MediaSessionPlaybackState) {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state;
  }

  function describe() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: subtitle,
      album,
      artwork: [],
    });
  }

  // 预取下一段，让服务端提前生成，切换时几乎无等待。
  function prefetch(index: number) {
    if (index < 0 || index >= settings.current.count) return;
    if (!ahead.current) {
      ahead.current = new Audio();
      ahead.current.preload = "auto";
    }
    ahead.current.src = source(index);
  }

  function playFrom(index: number) {
    const el = audio.current;
    // 代码段没有音频，落点先推进到下一个可朗读块。
    const at = settings.current.readable[index] ? index : nextReadable(index);
    if (!el || at < 0 || at >= settings.current.count) return;
    const own = ++token.current;
    position.current = at;
    pending.current = false;
    setCurrent(at);
    setError("");
    phaseTo("playing");
    el.onended = () => {
      if (own !== token.current || phase.current !== "playing") return;
      const next = nextReadable(at + 1);
      if (next >= 0) playFrom(next);
      else if (settings.current.loop) playFrom(0); // 标题恒可朗读
      else phaseTo("ended");
    };
    el.onerror = () => {
      if (own !== token.current) return;
      phaseTo("error");
      setError("音频获取失败，可从当前段重试。");
    };
    el.src = source(at);
    el.playbackRate = settings.current.rate;
    describe();
    session("playing");
    el.play().catch(() => {
      if (own !== token.current) return;
      phaseTo("error");
      setError("浏览器阻止了播放，请再次点击播放。");
    });
    const next = nextReadable(at + 1);
    prefetch(next >= 0 ? next : settings.current.loop ? 0 : -1);
  }

  function stop() {
    token.current++;
    position.current = -1;
    pending.current = false;
    const el = audio.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
    }
    if (ahead.current) ahead.current.removeAttribute("src");
    setCurrent(-1);
    setError("");
    phaseTo("idle");
    session("none");
  }

  function pause() {
    if (phase.current !== "playing") return;
    audio.current?.pause();
    session("paused");
    phaseTo("paused");
  }

  function resume() {
    if (phase.current !== "paused") return;
    const el = audio.current;
    if (!el) return;
    // 暂停期间换过音色就重新取当前段，否则直接续播。
    if (pending.current) {
      playFrom(Math.max(0, position.current));
      return;
    }
    el.play().then(
      () => {
        session("playing");
        phaseTo("playing");
      },
      () => {
        phaseTo("error");
        setError("浏览器阻止了播放，请再次点击播放。");
      },
    );
  }

  function jump(delta: number) {
    if (phase.current !== "playing" && phase.current !== "paused") return;
    // 跳过代码段；到头则回绕，与原来的循环切段行为一致。
    const at =
      delta > 0
        ? nextReadable(position.current + 1)
        : prevReadable(position.current - 1);
    const wrap =
      at >= 0
        ? at
        : delta > 0
          ? nextReadable(0)
          : prevReadable(settings.current.count - 1);
    if (wrap < 0) return;
    playFrom(wrap);
  }

  function start(nextLoop: boolean) {
    settings.current.loop = nextLoop;
    setLoop(nextLoop);
    playFrom(0);
  }

  function configure(nextVoice: string, nextRate: number) {
    const voiceChanged = nextVoice !== settings.current.voice;
    settings.current.voice = nextVoice;
    settings.current.rate = nextRate;
    setVoice(nextVoice);
    setRate(nextRate);
    if (audio.current) audio.current.playbackRate = nextRate;
    if (!voiceChanged) return;
    // 换音色要换音频文件，从当前段重新开始。
    if (phase.current === "playing") playFrom(Math.max(0, position.current));
    else if (phase.current === "paused") pending.current = true;
  }

  function retry() {
    playFrom(Math.max(0, position.current));
  }

  function applyStatus(next: StatusResponse) {
    statusRef.current = next;
    setVoices(next.voices);
    setTotal(next.total);
  }

  // 读取各音色已生成的段落数；首次加载时据此选定默认音色。
  async function loadStatus(signal?: AbortSignal) {
    const next = await api<StatusResponse>(
      `/articles/${articleId}/audio-status`,
      "GET",
      undefined,
      signal,
    );
    applyStatus(next);
    if (!picked.current && next.voices.length) {
      picked.current = true;
      // 默认选中已生成音频最多的音色；并列时取列表首个（即后端默认音色）。
      const best = next.voices.reduce(
        (a, b) => (b.ready > a.ready ? b : a),
        next.voices[0],
      );
      if (best.id !== settings.current.voice) {
        settings.current.voice = best.id;
        setVoice(best.id);
      }
    }
  }

  // 保存文章后服务端会在后台预热默认音色，这里轮询进度；就绪后停止，
  // 连续 30 次（约 90 秒）没有新进展也停止，避免空转。
  useEffect(() => {
    let ticks = 0;
    let seen = -1;
    const timer = window.setInterval(() => {
      const latest = statusRef.current;
      if (!latest.total) return;
      const have =
        latest.voices.find((v) => v.id === settings.current.voice)?.ready ?? 0;
      if (have >= latest.total) return;
      if (have > seen) {
        seen = have;
        ticks = 0;
      }
      if (++ticks > 30) return;
      api<StatusResponse>(`/articles/${articleId}/audio-status`, "GET")
        .then(applyStatus)
        .catch(() => {});
    }, 3000);
    return () => window.clearInterval(timer);
  }, [articleId]);

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audio.current = el;
    const controller = new AbortController();
    loadStatus(controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted)
          setVoicesError(e instanceof Error ? e.message : "音频状态加载失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setVoicesLoading(false);
      });
    if ("mediaSession" in navigator) {
      const ms = navigator.mediaSession;
      ms.setActionHandler("play", () => resume());
      ms.setActionHandler("pause", () => pause());
      ms.setActionHandler("stop", () => stop());
      ms.setActionHandler("nexttrack", () => jump(1));
      ms.setActionHandler("previoustrack", () => jump(-1));
    }
    return () => {
      controller.abort();
      token.current++;
      el.pause();
      if ("mediaSession" in navigator) {
        const ms = navigator.mediaSession;
        for (const action of [
          "play",
          "pause",
          "stop",
          "nexttrack",
          "previoustrack",
        ] as MediaSessionAction[])
          ms.setActionHandler(action, null);
        ms.metadata = null;
        ms.playbackState = "none";
      }
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
    voicesError,
    voicesLoading,
    readySegments: voices.find((v) => v.id === voice)?.ready ?? 0,
    total,
    setLoop,
    configure,
    stop,
    pause,
    resume,
    retry,
    playOnce: () => start(false),
    playLoop: () => start(true),
  };
}
