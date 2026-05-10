import { OBJECTS, TYPE_LABELS } from "./data.js";
import { sim } from "./state.js";

// ── Construction de la sidebar ────────────────────
export function buildSidebar(onSelect) {
  const sidebar = document.getElementById("sidebar");

  // Regroupe les objets par type
  const groups = {};
  OBJECTS.forEach((obj) => {
    if (!groups[obj.type]) groups[obj.type] = [];
    groups[obj.type].push(obj);
  });

  // Génère le HTML
  sidebar.innerHTML = `
    <div class="sb-header">
      <span class="sb-logo">3D</span> Space Objects
    </div>
    <div class="sb-body">
      ${Object.entries(groups)
        .map(
          ([type, items]) => `
        <div class="sb-group">
          <div class="sb-group-label" style="color:${TYPE_LABELS[type].color}">
            <span class="sb-group-line"></span>
            ${TYPE_LABELS[type].label}
          </div>
          ${items
            .map(
              (obj) => `
            <div class="sb-item" data-id="${obj.id}">
              <span class="sb-dot" style="background:${obj.color}"></span>
              <span class="sb-name">${obj.name}</span>
              <span class="sb-arrow">›</span>
            </div>
          `
            )
            .join("")}
        </div>
      `
        )
        .join("")}
    </div>`;

  // Clics sur les items
  sidebar.querySelectorAll(".sb-item").forEach((el) => {
    el.addEventListener("click", () => {
      // Retire la sélection précédente
      sidebar
        .querySelectorAll(".sb-item")
        .forEach((i) => i.classList.remove("active"));
      el.classList.add("active");
      // Appelle le callback avec l'id de l'objet
      const obj = OBJECTS.find((o) => o.id === el.dataset.id);
      if (obj) onSelect(obj);
    });
  });
}

export function buildSimControls() {
  const hud = document.createElement("div");
  hud.id = "sim-hud";
  hud.innerHTML = `
    <button id="btn-pause">⏸ Pause</button>
    <div id="speed-control">
      <span id="speed-label">×1.5</span>
      <input type="range" id="speed-slider" min="0" max="10" step="0.1" value="1.5"/>
    </div>
  `;
  document.body.appendChild(hud);

  document.getElementById("btn-pause").addEventListener("click", () => {
    sim.paused = !sim.paused;
    const btn = document.getElementById("btn-pause");
    btn.textContent = sim.paused ? "▶ Reprendre" : "⏸ Pause";
    btn.classList.toggle("active", sim.paused);
  });

  document.getElementById("speed-slider").addEventListener("input", (e) => {
    sim.speedFactor = parseFloat(e.target.value);
    document.getElementById(
      "speed-label"
    ).textContent = `×${sim.speedFactor.toFixed(1)}`;
  });
}

// ── Sélection depuis la scène (clic sur mesh) ─────
export function setActiveItem(id) {
  const sidebar = document.getElementById("sidebar");
  sidebar.querySelectorAll(".sb-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === id);
  });
}

// ── Affiche l'infobulle ───────────────────────────
export function showTooltip(obj) {
  const tooltip = document.getElementById("tooltip");
  const typeLabel = TYPE_LABELS[obj.type];

  // Génère les lignes de faits
  const factsHTML = Object.entries(obj.facts)
    .map(
      ([key, val]) => `
      <div class="tt-fact">
        <span class="tt-fact-label">${key}</span>
        <span class="tt-fact-value">${val}</span>
      </div>
    `
    )
    .join("");

  tooltip.innerHTML = `
      <div class="tt-header">
        <div class="tt-dot" style="background:${obj.color};box-shadow:0 0 6px ${obj.color}"></div>
        <span class="tt-name">${obj.name}</span>
        <span class="tt-type" style="color:${typeLabel.color};background:${typeLabel.color}22">${typeLabel.label}</span>
      </div>
      <div class="tt-desc">${obj.desc}</div>
      <div class="tt-facts">${factsHTML}</div>
    `;

  // Déclenche l'animation d'apparition
  tooltip.classList.add("visible");
}

// ── Cache l'infobulle ─────────────────────────────
export function hideTooltip() {
  document.getElementById("tooltip").classList.remove("visible");
}

export function buildBackButton(onBack) {
  const btn = document.createElement("button");
  btn.id = "btn-back";
  btn.textContent = "← Système solaire";
  document.body.appendChild(btn);
  btn.addEventListener("click", () => {
    btn.classList.remove("visible");
    onBack();
  });
}

export function showBackButton() {
  document.getElementById("btn-back").classList.add("visible");
}

export function buildOrbitToggle(onToggle) {
  const btn = document.createElement("button");
  btn.id = "btn-orbits";
  btn.textContent = "⬡ Orbites";
  document.body.appendChild(btn);
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    onToggle(btn.classList.contains("active"));
  });
}

export function buildAudioControls(onVolumeChange, onToggle) {
  const div = document.createElement("div");
  div.id = "audio-hud";
  div.innerHTML = `
  <button id="btn-music">♪ Musique</button>
  <div id="volume-control">
    <span id="volume-label">×0.1</span>
    <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.1"/>
  </div>
  <span id="music-credit">
    <a href="https://www.scottbuckley.com.au" target="_blank" rel="noopener">Scott Buckley</a>
    — "Celestial" (CC BY 4.0)
  </span>
`;
  document.body.appendChild(div);

  document.getElementById("btn-music").addEventListener("click", () => {
    const playing = onToggle();
    document.getElementById("btn-music").textContent = playing
      ? "♪ Musique"
      : "♩ Musique";
    document.getElementById("btn-music").classList.toggle("active", !playing);
  });

  document.getElementById("volume-slider").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById("volume-label").textContent = `×${v.toFixed(1)}`;
    onVolumeChange(v);
  });
}
