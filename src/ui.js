import { OBJECTS, TYPE_LABELS } from "./data.js";
import { sim } from "./state.js";

// #region ── Curseur custom — survol UI ──────────────────────────────────────

// Délégation globale : survol de n'importe quel élément interactif UI
// bascule body.cursor-ui (bleu clair). Le canvas gère cursor-planet lui-même via raycasting.
// cursor-planet a priorité : on ne pose cursor-ui que si cursor-planet est absent.
const UI_SELECTOR = "button, a, .sb-item, input[type=range]";

document.addEventListener("mouseover", (e) => {
  if (e.target.closest(UI_SELECTOR)) {
    document.body.classList.remove("cursor-planet");
    document.body.classList.add("cursor-ui");
  }
});

document.addEventListener("mouseout", (e) => {
  if (e.target.closest(UI_SELECTOR)) {
    document.body.classList.remove("cursor-ui");
  }
});

// #endregion

// #region ── Sidebar — dépendants positionnels ─────────────────────────────────

// Met à jour la CSS custom property --sidebar-width sur #sidebar,
// et repositionne les éléments dépendants sur mobile.
// Les positions desktop sont gérées entièrement en CSS.
function updateSidebarDependents(isCollapsed) {
  const sidebarWidth = isCollapsed ? 52 : 232;

  // La custom property est lue par btn-display via CSS (left: var(--sidebar-width))
  // et par les éléments mobiles ci-dessous via JS (les overrides inline sont nécessaires
  // sur mobile car les positions varient selon l'état collapsed)
  document.documentElement.style.setProperty(
    "--sidebar-width",
    `${sidebarWidth}px`
  );

  if (window.innerWidth <= 768) {
    const left = `${sidebarWidth}px`;
    const displayWrapper = document.getElementById("display-panel-wrapper");
    if (displayWrapper) displayWrapper.style.left = left;
    const audioHud = document.getElementById("audio-hud");
    const simHud = document.getElementById("sim-hud");
    const tooltip = document.getElementById("tooltip");

    if (audioHud) {
      audioHud.style.left = left;
      audioHud.style.right = "12px";
    }
    if (simHud) {
      simHud.style.left = left;
      simHud.style.right = "12px";
      simHud.style.transform = "none";
    }
    if (tooltip) {
      tooltip.style.left = left;
    }
  } else {
    // Desktop — on remet les positions CSS par défaut (supprime les overrides mobiles)
    const audioHud = document.getElementById("audio-hud");
    const simHud = document.getElementById("sim-hud");
    const tooltip = document.getElementById("tooltip");

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

// #endregion

// #region ── Sidebar — construction et interactions ───────────────────────────

export function clearActiveItem() {
  document
    .querySelectorAll("#sidebar .sb-item")
    .forEach((el) => el.classList.remove("active"));
}

// Construit la sidebar depuis OBJECTS (groupés par type).
// Les couleurs de groupe et de planète sont passées via CSS custom properties
// pour éviter les styles inline.
export function buildSidebar(onSelect, onHover, onHoverEnd, isActive) {
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
            <div class="sb-item" data-id="${obj.id}" style="--planet-color:${obj.color}">
              <span class="sb-dot"></span>
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

  sidebar.querySelectorAll(".sb-item").forEach((el) => {
    el.addEventListener("click", () => {
      if (isActive(el.dataset.id)) return; // déjà en follow — clic ignoré
      clearActiveItem();
      el.classList.add("active");
      const obj = OBJECTS.find((o) => o.id === el.dataset.id);
      if (obj) onSelect(obj);
    });

    el.addEventListener("mouseenter", () => {
      const obj = OBJECTS.find((o) => o.id === el.dataset.id);
      if (obj) onHover(obj);
    });

    el.addEventListener("mouseleave", () => {
      onHoverEnd();
    });
  });

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

export function setActiveItem(id) {
  document.querySelectorAll("#sidebar .sb-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === id);
  });
}

// #endregion

// #region ── Tooltip ──────────────────────────────────────────────────────────

// Affiche la tooltip enrichie : en-tête (nom + type), description, faits scientifiques,
// et — si disponible — la vitesse orbitale réelle (obj.speedKms).
// La vitesse est statique ici : le jitter live est géré par updateTooltipSpeed()
// appelée depuis la boucle animate() de main.js.
// Les couleurs sont passées via CSS custom properties (--planet-color, --type-color)
// pour éviter les styles inline.
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

  const simHTML = obj.sim
    ? `<div class="tt-sim">
        <div class="tt-sim-header">
          <span class="tt-sim-icon">ⓘ</span>
          <span class="tt-sim-title">Simulation</span>
        </div>
        ${Object.entries(obj.sim)
          .map(
            ([key, val]) => `
          <div class="tt-fact tt-fact--sim">
            <span class="tt-fact-label">${key}</span>
            <span class="tt-fact-value tt-fact-value--sim">${val}</span>
          </div>
        `
          )
          .join("")}
      </div>`
    : "";

  const wikiHTML = obj.wikipedia
    ? `<a class="tt-wiki" href="${obj.wikipedia}" target="_blank" rel="noopener">
        <span class="tt-wiki-icon">W</span> Wikipedia
      </a>`
    : "";

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
    <div class="tt-header" style="--planet-color:${obj.color}; --type-color:${typeLabel.color}">
      <div class="tt-dot"></div>
      <span class="tt-name">${obj.name}</span>
      <span class="tt-type">${typeLabel.label}</span>
      <button class="tt-toggle" title="Réduire">−</button>
    </div>
    <div class="tt-body">
      <div class="tt-desc">${obj.desc}</div>
      <div class="tt-facts">${factsHTML}</div>
      ${speedHTML}
      ${simHTML}
      ${wikiHTML}
    </div>
  `;

  const btn = tooltip.querySelector(".tt-toggle");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const collapsed = tooltip.classList.toggle("collapsed");
    btn.textContent = collapsed ? "+" : "−";
  });

  tooltip.classList.remove("collapsed");
  tooltip.classList.add("visible");
}

// Met à jour la valeur live de la vitesse dans la tooltip.
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

export function hideTooltip() {
  document.getElementById("tooltip").classList.remove("visible");
}

// #endregion

// #region ── Boutons HUD ──────────────────────────────────────────────────────

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

// #region ── Panel Affichage (orbites + labels) ───────────────────────────────

// Remplace btn-orbits et btn-labels par un seul bouton avec dropdown.
// onOrbit(bool), onLabelPlanets(bool), onLabelMoons(bool) — callbacks des 3 toggles.
export function buildDisplayPanel(onOrbit, onLabelPlanets, onLabelMoons) {
  const wrapper = document.createElement("div");
  wrapper.id = "display-panel-wrapper";

  const btn = document.createElement("button");
  btn.id = "btn-display";
  btn.textContent = "⬡ Affichage";
  wrapper.appendChild(btn);

  const panel = document.createElement("div");
  panel.id = "display-panel";
  panel.hidden = true;

  const items = [
    { id: "toggle-orbits", label: "Orbites", cb: onOrbit, state: false },
    {
      id: "toggle-label-planets",
      label: "Labels planètes",
      cb: onLabelPlanets,
      state: false,
    },
    {
      id: "toggle-label-moons",
      label: "Labels lunes",
      cb: onLabelMoons,
      state: false,
    },
  ];

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "dp-item";

    const label = document.createElement("span");
    label.textContent = item.label;

    const toggle = document.createElement("span");
    toggle.className = "dp-toggle";
    toggle.id = item.id;

    row.appendChild(label);
    row.appendChild(toggle);
    panel.appendChild(row);

    row.addEventListener("click", (e) => {
      e.stopPropagation(); // ne ferme pas le panel au clic sur un toggle
      item.state = !item.state;
      toggle.classList.toggle("on", item.state);
      item.cb(item.state);
    });
  });

  wrapper.appendChild(panel);
  document.body.appendChild(wrapper);

  // Ouvre/ferme le panel au clic sur le bouton
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    btn.classList.toggle("active", !isOpen);
  });

  // Ferme en cliquant ailleurs
  document.addEventListener("click", () => {
    panel.hidden = true;
    btn.classList.remove("active");
  });

  // Repositionne selon la sidebar
  const sidebar = document.getElementById("sidebar");
  updateSidebarDependents(sidebar.classList.contains("collapsed"));
}

// #endregion

// #region ── HUD Simulation ───────────────────────────────────────────────────

export function buildSimControls() {
  const hud = document.createElement("div");
  hud.id = "sim-hud";
  hud.innerHTML = `
    <button id="btn-pause">⏸</button>
    <div id="speed-control">
      <span id="speed-label">×0.5</span>
      <input type="range" id="speed-slider" min="0" max="100" step="1" value="35"/>
    </div>
  `;
  document.body.appendChild(hud);

  const btnPause = document.getElementById("btn-pause");
  const speedSlider = document.getElementById("speed-slider");
  const speedLabel = document.getElementById("speed-label");

  // Mapping logarithmique : slider 0..100 → speed 0..20
  // slider=0 → speed=0, slider=1..100 → log scale 0.01..20
  // Midpoint (~35) ≈ 0.5 (vitesse par défaut)
  function sliderToSpeed(s) {
    if (s === 0) return 0;
    return parseFloat((0.01 * Math.pow(20 / 0.01, s / 100)).toFixed(3));
  }

  function formatSpeed(v) {
    if (v === 0) return "×0";
    if (v < 0.1) return `×${v.toFixed(3)}`;
    if (v < 1) return `×${v.toFixed(2)}`;
    return `×${v.toFixed(1)}`;
  }

  function updatePauseBtn() {
    const stopped = sim.paused || sim.speedFactor === 0;
    btnPause.textContent = stopped ? "▶" : "⏸";
    btnPause.classList.toggle("active", stopped);
  }

  // Si speedFactor=0, le clic remet la dernière vitesse non-nulle
  let lastNonZeroSlider = 35; // correspond à ~0.5

  btnPause.addEventListener("click", () => {
    if (sim.speedFactor === 0) {
      speedSlider.value = lastNonZeroSlider;
      sim.speedFactor = sliderToSpeed(lastNonZeroSlider);
      speedLabel.textContent = formatSpeed(sim.speedFactor);
    } else {
      sim.paused = !sim.paused;
    }
    updatePauseBtn();
  });

  speedSlider.addEventListener("input", (e) => {
    const s = parseInt(e.target.value);
    const v = sliderToSpeed(s);
    if (v > 0) lastNonZeroSlider = s;
    sim.speedFactor = v;
    speedLabel.textContent = formatSpeed(v);
    updatePauseBtn();
  });
}

// #endregion

// #region ── HUD Audio ────────────────────────────────────────────────────────

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

// #endregion
