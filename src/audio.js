const bgMusic = new Audio("/audio/sb_celestial.mp3");
bgMusic.loop = true;
bgMusic.volume = 0;

const ping = new Audio("/audio/ping.mp3");
ping.volume = 0.05;

const whoosh = new Audio("/audio/whooshBack.mp3");
whoosh.volume = 0.2;

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
