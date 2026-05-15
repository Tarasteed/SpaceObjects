// #region ── Musique de fond ──────────────────────────────────────────────────

const bgMusic = new Audio("/audio/sb_celestial.mp3");
bgMusic.loop = true;
bgMusic.volume = 0;

let started = false;

function fadeToVolume(target, duration) {
  const start = bgMusic.volume;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    bgMusic.volume = start + (target - start) * progress;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function initAudio() {
  if (started) return;
  bgMusic
    .play()
    .then(() => {
      started = true;
      fadeToVolume(0.1, 3000);
    })
    .catch(() => {});
}

export function setMusicVolume(v) {
  bgMusic.volume = Math.min(1, Math.max(0, v));
}

export function toggleMusic() {
  if (bgMusic.paused) {
    bgMusic.play().catch(() => {});
  } else {
    bgMusic.pause();
  }
  return !bgMusic.paused;
}

// #endregion

// #region ── Effets sonores ponctuels ─────────────────────────────────────────

const ping = new Audio("/audio/ping.mp3");
ping.volume = 0.05;

const whoosh = new Audio("/audio/whooshBack.mp3");
whoosh.volume = 0.2;

export function playPing() {
  ping.currentTime = 0;
  ping.play().catch(() => {});
}

export function playWhoosh() {
  whoosh.currentTime = 0;
  whoosh.play().catch(() => {});
}

// #endregion

// #region ── Hum atmosphérique ────────────────────────────────────────────────

const atmoHum = new Audio("/audio/Atmopshere.mp3");
atmoHum.loop = true;
atmoHum.volume = 0;

let atmoFadeRaf = null;

function cancelAtmoFade() {
  if (atmoFadeRaf) {
    cancelAnimationFrame(atmoFadeRaf);
    atmoFadeRaf = null;
  }
}

// Fade in vers 0.25 depuis le volume courant — pas de reset brutal
function fadeInAtmo(duration) {
  const start = atmoHum.volume;
  const target = 0.25;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    atmoHum.volume = start + (target - start) * progress;
    if (progress < 1) {
      atmoFadeRaf = requestAnimationFrame(step);
    } else {
      _atmoFading = false; // ← fade terminé, setAtmoVolume reprend la main
      atmoFadeRaf = null;
    }
  }
  atmoFadeRaf = requestAnimationFrame(step);
}

let _atmoFading = false;

export function startAtmoHum() {
  cancelAtmoFade();
  _atmoFading = true; // ← bloque setAtmoVolume pendant le fade in
  if (atmoHum.paused) {
    atmoHum.currentTime = 0;
    atmoHum.play().catch(() => {});
  }
  fadeInAtmo(1500);
}

export function stopAtmoHum() {
  cancelAtmoFade();
  const start = atmoHum.volume;
  const duration = 1000;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    atmoHum.volume = start * (1 - progress);
    if (progress < 1) {
      atmoFadeRaf = requestAnimationFrame(step);
    } else {
      atmoHum.pause();
      atmoFadeRaf = null;
    }
  }
  atmoFadeRaf = requestAnimationFrame(step);
}

export function pauseAtmoHum() {
  cancelAtmoFade();
  atmoHum.pause();
}

export function resumeAtmoHum() {
  atmoHum.play().catch(() => {});
  fadeInAtmo(800);
}

export function setAtmoVolume(v) {
  if (_atmoFading || atmoHum.paused) return; // ← ne pas interférer avec le fade
  atmoHum.volume = Math.max(0, Math.min(1, v));
}

// #endregion

// #region ── Hum ceinture d'astéroïdes ────────────────────────────────────────

// Géré via AudioContext (pas HTMLAudioElement) pour une loop fiable sur BufferSource.
// BufferSource ne supporte pas la pause native → on suspend/reprend l'AudioContext.
let asteroidSource = null;
let asteroidGain = null;
let asteroidBuffer = null;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

fetch("/audio/asteroidBelt.mp3")
  .then((r) => r.arrayBuffer())
  .then((buf) => audioCtx.decodeAudioData(buf))
  .then((decoded) => {
    asteroidBuffer = decoded;
  })
  .catch(() => {});

export function startAsteroidHum() {
  if (!asteroidBuffer || asteroidSource) return;
  asteroidGain = audioCtx.createGain();
  asteroidGain.gain.setValueAtTime(0, audioCtx.currentTime);
  asteroidGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 2);
  asteroidGain.connect(audioCtx.destination);
  asteroidSource = audioCtx.createBufferSource();
  asteroidSource.buffer = asteroidBuffer;
  asteroidSource.loop = true;
  asteroidSource.connect(asteroidGain);
  asteroidSource.start();
}

export function stopAsteroidHum() {
  if (!asteroidSource) return;
  // On résume l'audioCtx avant de stopper : s'il était suspendu (pause en cours),
  // ne pas le résumer laisserait le contexte bloqué en "suspended" pour le prochain start.
  audioCtx.resume().then(() => {
    if (!asteroidGain) return;
    asteroidGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    setTimeout(() => {
      asteroidSource?.stop();
      asteroidSource = null;
      asteroidGain = null;
    }, 1500);
  });
}

export function pauseAsteroidHum() {
  if (!asteroidSource || !asteroidGain) return;
  asteroidGain.gain.cancelScheduledValues(audioCtx.currentTime);
  asteroidGain.gain.setValueAtTime(0, audioCtx.currentTime);
  audioCtx.suspend();
}

export function resumeAsteroidHum() {
  if (asteroidSource) {
    // Source existante suspendue — on reprend l'AudioContext
    audioCtx.resume().then(() => {
      if (!asteroidGain) return;
      asteroidGain.gain.setValueAtTime(0, audioCtx.currentTime);
      asteroidGain.gain.linearRampToValueAtTime(
        0.04,
        audioCtx.currentTime + 0.8
      );
    });
  } else {
    // Pas de source active — on démarre depuis zéro
    startAsteroidHum();
  }
}

// #endregion
