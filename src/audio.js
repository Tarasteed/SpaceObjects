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

const pauseSound = new Audio("/audio/pause.mp3");
pauseSound.volume = 0.3;

const unpauseSound = new Audio("/audio/unpause.mp3");
unpauseSound.volume = 0.3;

export function playPing() {
  ping.currentTime = 0;
  ping.play().catch(() => {});
}

export function playWhoosh() {
  whoosh.currentTime = 0;
  whoosh.play().catch(() => {});
}

export function playPause() {
  pauseSound.currentTime = 0;
  pauseSound.play().catch(() => {});
}

export function playUnpause() {
  unpauseSound.currentTime = 0;
  unpauseSound.play().catch(() => {});
}

// #endregion

// #region ── Hum atmosphérique ────────────────────────────────────────────────

const atmoHum = new Audio("/audio/Atmopshere.mp3");
atmoHum.loop = true;
atmoHum.volume = 0;

let atmoFadeRaf = null;
let _atmoFading = false; // true pendant le fade in — bloque setAtmoVolume

function cancelAtmoFade() {
  if (atmoFadeRaf) {
    cancelAnimationFrame(atmoFadeRaf);
    atmoFadeRaf = null;
  }
}

// Fade in vers 0.25 depuis le volume courant — pas de reset brutal
function fadeInAtmo(duration) {
  _atmoFading = true;
  const start = atmoHum.volume;
  const target = 0.25;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    atmoHum.volume = start + (target - start) * progress;
    if (progress < 1) {
      atmoFadeRaf = requestAnimationFrame(step);
    } else {
      _atmoFading = false; // fade terminé — setAtmoVolume reprend la main
      atmoFadeRaf = null;
    }
  }
  atmoFadeRaf = requestAnimationFrame(step);
}

export function startAtmoHum() {
  cancelAtmoFade();
  if (atmoHum.paused) {
    atmoHum.currentTime = 0;
    atmoHum.play().catch(() => {});
  }
  fadeInAtmo(1500);
}

export function stopAtmoHum() {
  cancelAtmoFade();
  _atmoFading = false;
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
  _atmoFading = false;
  atmoHum.pause();
}

export function resumeAtmoHum() {
  atmoHum.play().catch(() => {});
  fadeInAtmo(800);
}

// Appelée chaque frame en mode FOLLOWING pour adapter le volume à la distance.
// Ne fait rien pendant le fade in initial (évite d'écraser le fondu).
export function setAtmoVolume(v) {
  if (_atmoFading || atmoHum.paused) return;
  atmoHum.volume = Math.max(0, Math.min(1, v));
}

// Appelée par triggerPause() dans main.js à chaque frame de l'animation.
// ratio = 0 → silence, ratio = 1 → volume normal (0.25).
// Ignorée pendant _atmoFading pour ne pas interférer avec le fade in initial.
export function setAtmoFadeRatio(ratio) {
  if (_atmoFading || atmoHum.paused) return;
  atmoHum.volume = Math.max(0, Math.min(1, 0.25 * ratio));
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

// Appelée par triggerPause() dans main.js à chaque frame de l'animation.
// ratio = 0 → silence, ratio = 1 → volume normal (0.04).
// Utilise setValueAtTime pour un changement immédiat sans scheduling conflict.
export function setAsteroidFadeRatio(ratio) {
  if (!asteroidGain) return;
  asteroidGain.gain.setValueAtTime(
    Math.max(0, 0.04 * ratio),
    audioCtx.currentTime
  );
}

// #endregion
