/**
 * Media Session + Web Audio 静音 — 锁屏/状态栏显示「正在计时」
 *
 * 原理：
 *   - 移动端浏览器（特别是 iOS Safari / Android Chrome）要求"页面正在播放媒体"
 *     才会把 MediaSession 的 metadata 渲染到锁屏/控制中心
 *   - 用 Web Audio API 启动一个 0 音量的 OscillatorNode，浏览器会把它视作活跃媒体
 *   - 不依赖额外音频文件，体积为 0
 *   - 必须在用户主动交互（点击开始计时）后才能启动，否则会被自动暂停
 */
type MetaPayload = { title: string; artist: string; album?: string };

let audioCtx: AudioContext | null = null;
let oscNode: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let playPromise: Promise<void> | null = null;

function startSilent(): void {
  if (typeof window === 'undefined') return;
  try {
    // 兼容老 Safari
    const Ctx: typeof AudioContext =
      window.AudioContext ||
      // @ts-expect-error webkit 前缀
      window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();

    if (audioCtx.state === 'suspended') {
      playPromise = audioCtx.resume();
    }

    if (!oscNode) {
      oscNode = audioCtx.createOscillator();
      oscNode.type = 'sine';
      oscNode.frequency.value = 0; // 0Hz 不可闻
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // 0 音量
      oscNode.connect(gainNode).connect(audioCtx.destination);
      oscNode.start();
    }
  } catch {
    /* 忽略不支持 */
  }
}

function stopSilent(): void {
  try {
    if (oscNode) {
      oscNode.stop();
      oscNode.disconnect();
      oscNode = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (audioCtx) {
      void audioCtx.close();
      audioCtx = null;
    }
    playPromise = null;
  } catch {
    /* ignore */
  }
}

export function startMediaSession(meta: MetaPayload): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  startSilent();
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist,
      album: meta.album ?? '迹时',
    });
    // 默认播放状态（锁屏上能正确显示）
    navigator.mediaSession.playbackState = 'playing';
  } catch {
    /* 忽略不支持 */
  }
}

export function updateMediaSession(meta: Partial<MetaPayload>): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  const cur = navigator.mediaSession.metadata;
  if (!cur) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title ?? cur.title,
      artist: meta.artist ?? cur.artist,
      album: meta.album ?? cur.album,
    });
  } catch {
    /* ignore */
  }
}

export function stopMediaSession(): void {
  if (typeof window === 'undefined') return;
  stopSilent();
  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    }
  } catch {
    /* ignore */
  }
}

export function setMediaActionHandlers(handlers: {
  onPause?: () => void;
  onPlay?: () => void;
  onStop?: () => void;
}): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    if (handlers.onPause) navigator.mediaSession.setActionHandler('pause', handlers.onPause);
    if (handlers.onPlay) navigator.mediaSession.setActionHandler('play', handlers.onPlay);
    if (handlers.onStop) navigator.mediaSession.setActionHandler('stop', handlers.onStop);
  } catch {
    /* 旧浏览器可能不支持 */
  }
}
