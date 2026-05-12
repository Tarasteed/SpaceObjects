import { OBJECTS, TYPE_LABELS } from "./data.js";
import { sim } from "./state.js";

// ── Utilitaire : repositionne les éléments selon l'état de la sidebar ────────
function updateSidebarDependents(isCollapsed) {
  const sidebarWidth = isCollapsed ? 52 : 232;
  const btnOrbits = document.getElementById("btn-orbits");
  const audioHud = document.getElementById("audio-hud");
  const simHud = document.getElementById("sim-hud");
  const tooltip = document.getElementById("tooltip");

  if (btnOrbits) btnOrbits.style.left = `${sidebarWidth}px`;

  if (window.innerWidth <= 768) {
    if (audioHud) {
      audioHud.style.left = `${sidebarWidth}px`;
      audioHud.style.right = "12px"; // ← ajouter
    }
    if (simHud) {
      simHud.style.left = `${sidebarWidth}px`;
      simHud.style.right = "12px";
      simHud.style.transform = "none";
    }
    if (tooltip) tooltip.style.left = `${sidebarWidth}px`;
  } else {
    // Desktop — on remet les positions CSS par défaut
    if (audioHud) {
      audioHud.style.left = "";
      audioHud.style.right = "24px";
    }
    if (simHud) {
      simHud.style.left = "50%";
      simHud.style.right = "";
      simHud.style.transform = "translateX(-50%)";
    }
    if (tooltip) {
      tooltip.style.left = "";
      tooltip.style.right = "24px";
    }
  }
}

window.addEventListener("resize", () => {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  updateSidebarDependents(sidebar.classList.contains("collapsed"));
});

// ── Désélectionne tous les items de la sidebar ───────────────────────────────
export function clearActiveItem() {
  document
    .querySelectorAll("#sidebar .sb-item")
    .forEach((el) => el.classList.remove("active"));
}

// ── Construit la sidebar depuis OBJECTS (groupés par type) ───────────────────
export function buildSidebar(onSelect) {
  const sidebar = document.getElementById("sidebar");

  const groups = {};
  OBJECTS.forEach((obj) => {
    if (!groups[obj.type]) groups[obj.type] = [];
    groups[obj.type].push(obj);
  });

  sidebar.innerHTML = `
    <div class="sb-header">
      <div class="sb-header-top">
        <span><span class="sb-logo">3D</span> Space Objects</span>
        <button id="btn-sidebar-toggle" title="Réduire">‹</button>
      </div>
      <a href="https://github.com/Tarasteed/SpaceObjects" target="_blank" rel="noopener" id="sb-github">
        ⎇ GitHub
      </a>
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

  // Repliée par défaut sur mobile
  if (window.innerWidth <= 768) {
    sidebar.classList.add("collapsed");
    document.getElementById("btn-sidebar-toggle").textContent = "›";
  }

  // Clics sur les items
  sidebar.querySelectorAll(".sb-item").forEach((el) => {
    el.addEventListener("click", () => {
      clearActiveItem();
      el.classList.add("active");
      const obj = OBJECTS.find((o) => o.id === el.dataset.id);
      if (obj) onSelect(obj);
    });
  });

  // Toggle sidebar
  document
    .getElementById("btn-sidebar-toggle")
    .addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      const isCollapsed = sidebar.classList.contains("collapsed");
      document.getElementById("btn-sidebar-toggle").textContent = isCollapsed
        ? "›"
        : "‹";
      updateSidebarDependents(isCollapsed);
    });
}

// ── Construit le HUD pause / vitesse de simulation ───────────────────────────
export function buildSimControls() {
  const hud = document.createElement("div");
  hud.id = "sim-hud";
  hud.innerHTML = `
    <button id="btn-pause">⏸</button>
    <div id="speed-control">
      <span id="speed-label">×1.5</span>
      <input type="range" id="speed-slider" min="0" max="20" step="0.1" value="1.5"/>
    </div>
  `;
  document.body.appendChild(hud);

  const btnPause = document.getElementById("btn-pause");
  const speedSlider = document.getElementById("speed-slider");
  const speedLabel = document.getElementById("speed-label");

  // ── Helpers visuels ───────────────────────────────
  // Centralise la mise à jour de l'icône et de la classe active du bouton
  // selon les deux sources d'arrêt : pause réelle et vitesse zéro.
  function updatePauseBtn() {
    const stopped = sim.paused || sim.speedFactor === 0;
    btnPause.textContent = stopped ? "▶" : "⏸";
    btnPause.classList.toggle("active", stopped);
  }

  // ── Bouton pause ──────────────────────────────────
  // Si speedFactor = 0, le clic remet le slider à la dernière valeur non-nulle
  // plutôt que de toggler sim.paused — évite l'état incohérent pause+vitesse0.
  let lastNonZeroSpeed = sim.speedFactor; // mémorise la dernière vitesse > 0

  btnPause.addEventListener("click", () => {
    if (sim.speedFactor === 0) {
      // Cas vitesse zéro — on remet la dernière vitesse connue plutôt que toggler
      sim.speedFactor = lastNonZeroSpeed || 1.5;
      speedSlider.value = sim.speedFactor;
      speedLabel.textContent = `×${sim.speedFactor.toFixed(1)}`;
      // sim.paused reste inchangé — on ne touche qu'au slider
    } else {
      sim.paused = !sim.paused;
    }
    updatePauseBtn();
  });

  // ── Slider vitesse ────────────────────────────────
  speedSlider.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    if (v > 0) lastNonZeroSpeed = v; // mémorise dès qu'on dépasse 0
    sim.speedFactor = v;
    speedLabel.textContent = `×${v.toFixed(1)}`;
    updatePauseBtn();
  });
}

// ── Synchronise l'item actif dans la sidebar (depuis raycasting) ─────────────
export function setActiveItem(id) {
  document.querySelectorAll("#sidebar .sb-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === id);
  });
}

// ── Affiche la tooltip enrichie ───────────────────────────────────────────────
// Contenu : en-tête (nom + type), description, faits scientifiques,
// et — si disponible — la vitesse orbitale réelle (obj.speedKms).
// La vitesse est statique ici : le jitter live est géré par updateTooltipSpeed()
// appelée depuis la boucle animate() de main.js.
export function showTooltip(obj) {
  const tooltip = document.getElementById("tooltip");
  const typeLabel = TYPE_LABELS[obj.type];

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

  const speedHTML =
    obj.speedKms != null
      ? `
    <div class="tt-speed">
      <span class="tt-speed-label">vitesse orbitale</span>
      <span class="tt-speed-value" id="tt-speed-live">${obj.speedKms.toFixed(
        2
      )}</span>
      <span class="tt-speed-unit">km/s</span>
    </div>
  `
      : "";

  tooltip.innerHTML = `
    <div class="tt-header">
      <div class="tt-dot" style="background:${obj.color};box-shadow:0 0 6px ${obj.color}"></div>
      <span class="tt-name">${obj.name}</span>
      <span class="tt-type" style="color:${typeLabel.color};background:${typeLabel.color}22">
        ${typeLabel.label}
      </span>
      <button class="tt-toggle" title="Réduire">−</button>
    </div>
    <div class="tt-body">
      <div class="tt-desc">${obj.desc}</div>
      <div class="tt-facts">${factsHTML}</div>
      ${speedHTML}
    </div>
  `;

  // Toggle collapse
  const btn = tooltip.querySelector(".tt-toggle");
  const body = tooltip.querySelector(".tt-body");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const collapsed = tooltip.classList.toggle("collapsed");
    btn.textContent = collapsed ? "+" : "−";
  });

  tooltip.classList.remove("collapsed");
  tooltip.classList.add("visible");
}

// ── Met à jour la valeur live de la vitesse dans la tooltip ──────────────────
// Appelée à chaque frame depuis main.js quand on est en mode FOLLOWING.
// Le jitter simule une mesure de télémétrie en temps réel (±JITTER_RANGE km/s).
// Ne fait rien si la tooltip est fermée ou si l'objet n'a pas de speedKms.
const JITTER_RANGE = 0.06; // km/s — variation par frame, perceptible mais subtile

export function updateTooltipSpeed(obj, isFollowing) {
  if (!isFollowing || !obj?.speedKms) return;

  const el = document.getElementById("tt-speed-live");
  if (!el) return;

  const jitter = (Math.random() - 0.5) * 2 * JITTER_RANGE;
  el.textContent = Math.max(0, obj.speedKms + jitter).toFixed(2);
}

// ── Cache la tooltip ──────────────────────────────────────────────────────────
export function hideTooltip() {
  document.getElementById("tooltip").classList.remove("visible");
}

// ── Bouton retour système solaire ─────────────────────────────────────────────
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

// ── Toggle orbites ────────────────────────────────────────────────────────────
export function buildOrbitToggle(onToggle) {
  const btn = document.createElement("button");
  btn.id = "btn-orbits";
  btn.textContent = "⬡ Orbites";
  document.body.appendChild(btn);

  const sidebar = document.getElementById("sidebar");
  const isCollapsed = sidebar.classList.contains("collapsed");
  updateSidebarDependents(isCollapsed);

  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    onToggle(btn.classList.contains("active"));
  });
}

// ── HUD audio (musique + volume) ─────────────────────────────────────────────
export function buildAudioControls(onVolumeChange, onToggle) {
  const div = document.createElement("div");
  div.id = "audio-hud";
  div.innerHTML = `
    <button id="btn-music">⏸</button>
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

  const sidebar = document.getElementById("sidebar");
  updateSidebarDependents(sidebar.classList.contains("collapsed"));

  document.getElementById("btn-music").addEventListener("click", () => {
    const playing = onToggle();
    document.getElementById("btn-music").textContent = playing ? "⏸" : "▶";
    document.getElementById("btn-music").classList.toggle("active", !playing);
  });

  document.getElementById("volume-slider").addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    document.getElementById("volume-label").textContent = `×${v.toFixed(1)}`;
    onVolumeChange(v);
  });
}
