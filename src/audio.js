const bgMusic = new Audio("/audio/sb_celestial.mp3");
bgMusic.loop = true;
bgMusic.volume = 0;

const ping = new Audio("/audio/ping.mp3");
ping.volume = 0.05;

const whoosh = new Audio("/audio/whooshBack.mp3");
whoosh.volume = 0.2;

const atmoHum = new Audio("/audio/Atmopshere.mp3");
atmoHum.loop = true;
atmoHum.volume = 0;

// ── Asteroid hum via AudioContext pour loop fiable ──
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

export function playPing() {
  ping.currentTime = 0;
  ping.play().catch(() => {});
}

export function playWhoosh() {
  whoosh.currentTime = 0;
  whoosh.play().catch(() => {});
}

function fadeAudio(audio, targetVol, duration) {
  const start = audio.volume;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    audio.volume = start + (targetVol - start) * progress;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

let atmoFadeRaf = null;

function cancelAtmoFade() {
  if (atmoFadeRaf) {
    cancelAnimationFrame(atmoFadeRaf);
    atmoFadeRaf = null;
  }
}

export function startAtmoHum() {
  cancelAtmoFade();
  if (atmoHum.paused) {
    atmoHum.currentTime = 0;
    atmoHum.play().catch(() => {});
  }
  // Fade in depuis le volume actuel — pas de reset brutal
  const start = atmoHum.volume;
  const target = 0.25;
  const duration = 1500;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    atmoHum.volume = start + (target - start) * progress;
    if (progress < 1) atmoFadeRaf = requestAnimationFrame(step);
  }
  atmoFadeRaf = requestAnimationFrame(step);
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
  asteroidGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
  setTimeout(() => {
    asteroidSource?.stop();
    asteroidSource = null;
    asteroidGain = null;
  }, 1500);
}
