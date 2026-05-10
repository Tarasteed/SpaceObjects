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
  .then(r => r.arrayBuffer())
  .then(buf => audioCtx.decodeAudioData(buf))
  .then(decoded => { asteroidBuffer = decoded; })
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
      fadeToVolume(0.3, 3000);
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

export function startAtmoHum() {
  atmoHum.currentTime = 0;
  atmoHum.play().catch(() => {});
  fadeAudio(atmoHum, 0.7, 2000);
}

export function stopAtmoHum() {
  fadeAudio(atmoHum, 0, 1500);
  setTimeout(() => atmoHum.pause(), 1500);
}

export function startAsteroidHum() {
  if (!asteroidBuffer || asteroidSource) return;
  asteroidGain = audioCtx.createGain();
  asteroidGain.gain.setValueAtTime(0, audioCtx.currentTime);
  asteroidGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 2);
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