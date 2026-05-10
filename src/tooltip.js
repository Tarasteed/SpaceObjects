// tooltip.js — Tooltip style Dead Space
// Overlay SVG positionné au-dessus du canvas Three.js.
// La ligne SVG est mise à jour à chaque frame depuis la boucle animate() de main.js.

import { TYPE_LABELS } from "./data.js";

// ── Références DOM ────────────────────────────────
let overlay = null; // <svg> overlay plein écran
let lineEl = null; // <polyline> ligne planète → panneau
let dotEl = null; // <circle> point d'ancrage sur la planète
let panelEl = null; // <foreignObject> panneau HTML dans le SVG
let isVisible = false;

// Position fixe du panneau dans l'écran (haut-droit, avec marges)
const PANEL_W = 260;
const PANEL_H = 210;
const PANEL_MARGIN_RIGHT = 24;
const PANEL_MARGIN_TOP = 24;

// ── Initialisation de l'overlay SVG ──────────────
export function initTooltipOverlay() {
  overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.setAttribute("id", "ds-tooltip-overlay");
  overlay.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 20;
    overflow: visible;
  `;

  // Ligne L-shape entre planète et panneau
  lineEl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  lineEl.setAttribute("fill", "none");
  lineEl.setAttribute("stroke", "#00d4ff");
  lineEl.setAttribute("stroke-width", "0.8");
  lineEl.setAttribute("opacity", "0.7");
  lineEl.setAttribute("points", "0,0");

  // Petits ticks décoratifs sur la ligne (2 segments courts)
  const tick1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  tick1.setAttribute("stroke", "#00d4ff");
  tick1.setAttribute("stroke-width", "1.5");
  tick1.setAttribute("opacity", "0.9");
  tick1.setAttribute("id", "ds-tick1");

  const tick2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
  tick2.setAttribute("stroke", "#00d4ff");
  tick2.setAttribute("stroke-width", "1.5");
  tick2.setAttribute("opacity", "0.9");
  tick2.setAttribute("id", "ds-tick2");

  // Point d'ancrage sur la planète
  dotEl = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dotEl.setAttribute("r", "3");
  dotEl.setAttribute("fill", "#00d4ff");
  dotEl.setAttribute("opacity", "0.9");

  // Halo autour du point
  const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  halo.setAttribute("id", "ds-halo");
  halo.setAttribute("r", "6");
  halo.setAttribute("fill", "none");
  halo.setAttribute("stroke", "#00d4ff");
  halo.setAttribute("stroke-width", "0.8");
  halo.setAttribute("opacity", "0.4");

  // Panneau HTML via foreignObject
  panelEl = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject"
  );
  panelEl.setAttribute("width", PANEL_W);
  panelEl.setAttribute("height", PANEL_H);
  panelEl.style.pointerEvents = "auto";

  overlay.appendChild(lineEl);
  overlay.appendChild(tick1);
  overlay.appendChild(tick2);
  overlay.appendChild(halo);
  overlay.appendChild(dotEl);
  overlay.appendChild(panelEl);

  // Inséré dans le même conteneur que le canvas
  const container =
    document.getElementById("canvas").parentElement || document.body;
  container.style.position = "relative";
  container.appendChild(overlay);
}

// ── Calcule la position du panneau (évite les bords) ──
function getPanelPosition(planetX, planetY) {
  const sw = window.innerWidth;
  const sh = window.innerHeight;

  // Panneau par défaut en haut à droite
  let px = sw - PANEL_W - PANEL_MARGIN_RIGHT;
  let py = PANEL_MARGIN_TOP;

  // Si la planète est à droite, le panneau va à gauche
  if (planetX > sw * 0.6) {
    px = PANEL_MARGIN_RIGHT + 52; // 52 = sidebar repliée
  }

  // Si la planète est très haute, le panneau descend
  if (planetY < sh * 0.35) {
    py = Math.min(planetY + 40, sh - PANEL_H - 20);
  }

  return { px, py };
}

// ── Affiche le tooltip Dead Space ─────────────────
export function showDeadSpaceTooltip(obj, screenX, screenY) {
  if (!overlay) initTooltipOverlay();

  const typeLabel = TYPE_LABELS[obj.type];
  const sw = window.innerWidth;
  const sh = window.innerHeight;

  // Clamp la position de la planète aux bords
  const px_dot = Math.max(10, Math.min(screenX, sw - 10));
  const py_dot = Math.max(10, Math.min(screenY, sh - 10));

  const { px, py } = getPanelPosition(px_dot, py_dot);

  // Point d'ancrage
  dotEl.setAttribute("cx", px_dot);
  dotEl.setAttribute("cy", py_dot);
  document.getElementById("ds-halo").setAttribute("cx", px_dot);
  document.getElementById("ds-halo").setAttribute("cy", py_dot);

  // Panneau
  panelEl.setAttribute("x", px);
  panelEl.setAttribute("y", py);

  // Ligne L-shape : planète → coude → panneau
  const midX = px_dot + (px - px_dot) * 0.45;
  const midY = py_dot + (py + PANEL_H / 2 - py_dot) * 0.3;
  const panelEntryX = px;
  const panelEntryY = py + PANEL_H / 2;

  lineEl.setAttribute(
    "points",
    `${px_dot},${py_dot} ${midX},${midY} ${panelEntryX},${panelEntryY}`
  );

  // Ticks décoratifs sur la ligne (1/3 et 2/3 du trajet)
  const t1x = px_dot + (midX - px_dot) * 0.5;
  const t1y = py_dot + (midY - py_dot) * 0.5;
  document.getElementById("ds-tick1").setAttribute("x1", t1x - 4);
  document.getElementById("ds-tick1").setAttribute("y1", t1y - 4);
  document.getElementById("ds-tick1").setAttribute("x2", t1x + 4);
  document.getElementById("ds-tick1").setAttribute("y2", t1y + 4);

  const t2x = midX + (panelEntryX - midX) * 0.5;
  const t2y = midY + (panelEntryY - midY) * 0.5;
  document.getElementById("ds-tick2").setAttribute("x1", t2x - 4);
  document.getElementById("ds-tick2").setAttribute("y1", t2y);
  document.getElementById("ds-tick2").setAttribute("x2", t2x + 4);
  document.getElementById("ds-tick2").setAttribute("y2", t2y);

  // Contenu HTML du panneau
  const factsHTML = Object.entries(obj.facts)
    .map(
      ([key, val]) => `
      <div style="display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:1px solid rgba(0,180,220,0.08)">
        <span style="color:#4a8aaa;font-size:9px;letter-spacing:0.08em;text-transform:uppercase">${key}</span>
        <span style="color:#e0f4ff;font-size:11px;font-weight:700">${val}</span>
      </div>`
    )
    .join("");

  panelEl.innerHTML = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="
      width:${PANEL_W}px;
      height:${PANEL_H}px;
      background:#020c14;
      border:0.8px solid #00d4ff;
      border-radius:2px;
      font-family:'Courier New',monospace;
      box-sizing:border-box;
      overflow:hidden;
      animation: ds-fade-in 0.25s ease forwards;
    ">
      <style>
        @keyframes ds-fade-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
      </style>

      <!-- Barre titre -->
      <div style="
        background:#001a2a;
        padding:6px 10px 5px;
        border-bottom:1px solid rgba(0,212,255,0.25);
        display:flex;
        align-items:center;
        justify-content:space-between;
      ">
        <div style="display:flex;align-items:center;gap:7px">
          <div style="width:7px;height:7px;border-radius:50%;background:${
            obj.color
          };box-shadow:0 0 5px ${obj.color}"></div>
          <span style="color:#00d4ff;font-size:11px;font-weight:700;letter-spacing:0.12em">${obj.name.toUpperCase()}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="
            color:#00d4ff;
            background:#003344;
            border:0.5px solid rgba(0,212,255,0.4);
            font-size:8px;
            letter-spacing:0.08em;
            padding:2px 6px;
            border-radius:1px;
          ">${typeLabel.label.toUpperCase()}</span>
          <button id="ds-close-btn" style="
            background:none;
            border:none;
            color:#4a8aaa;
            font-size:13px;
            cursor:pointer;
            padding:0 2px;
            line-height:1;
            font-family:'Courier New',monospace;
          ">×</button>
        </div>
      </div>

      <!-- Barre indicateur gauche + données -->
      <div style="display:flex;height:calc(100% - 32px)">
        <div style="width:2px;background:rgba(0,212,255,0.12);flex-shrink:0;position:relative">
          <div style="position:absolute;top:0;width:2px;height:24px;background:#00d4ff;opacity:0.6"></div>
        </div>

        <div style="flex:1;padding:8px 10px;overflow:hidden">
          <!-- Section label -->
          <div style="color:#00a0cc;font-size:8px;letter-spacing:0.1em;margin-bottom:6px;opacity:0.7">
            DONNÉES ORBITALES
          </div>

          <!-- Facts -->
          ${factsHTML}

          <!-- Description -->
          <div style="
            margin-top:8px;
            color:#6aaabb;
            font-size:8.5px;
            line-height:1.4;
            border-top:1px solid rgba(0,180,220,0.1);
            padding-top:6px;
          ">${obj.desc}</div>
        </div>
      </div>

      <!-- Coins déco -->
      <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none" xmlns="http://www.w3.org/2000/svg">
        <polyline points="0,16 0,0 16,0" fill="none" stroke="#00d4ff" stroke-width="1.2" opacity="0.8"/>
        <polyline points="${PANEL_W},${PANEL_H - 16} ${PANEL_W},${PANEL_H} ${
    PANEL_W - 16
  },${PANEL_H}" fill="none" stroke="#00d4ff" stroke-width="1.2" opacity="0.8"/>
      </svg>
    </div>`;

  // Bouton fermer
  const closeBtn = panelEl.querySelector("#ds-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => hideDeadSpaceTooltip());
  }

  overlay.style.display = "block";
  isVisible = true;
}

// ── Met à jour la position de la ligne chaque frame ──
export function updateTooltipLine(screenX, screenY) {
  if (!isVisible || !lineEl || !dotEl) return;

  const sw = window.innerWidth;
  const sh = window.innerHeight;

  const px_dot = Math.max(10, Math.min(screenX, sw - 10));
  const py_dot = Math.max(10, Math.min(screenY, sh - 10));

  // Récupère la position actuelle du panneau
  const px = parseFloat(panelEl.getAttribute("x"));
  const py = parseFloat(panelEl.getAttribute("y"));

  dotEl.setAttribute("cx", px_dot);
  dotEl.setAttribute("cy", py_dot);
  document.getElementById("ds-halo").setAttribute("cx", px_dot);
  document.getElementById("ds-halo").setAttribute("cy", py_dot);

  const midX = px_dot + (px - px_dot) * 0.45;
  const midY = py_dot + (py + PANEL_H / 2 - py_dot) * 0.3;
  const panelEntryX = px;
  const panelEntryY = py + PANEL_H / 2;

  lineEl.setAttribute(
    "points",
    `${px_dot},${py_dot} ${midX},${midY} ${panelEntryX},${panelEntryY}`
  );

  // Mise à jour des ticks
  const t1x = px_dot + (midX - px_dot) * 0.5;
  const t1y = py_dot + (midY - py_dot) * 0.5;
  const tick1 = document.getElementById("ds-tick1");
  if (tick1) {
    tick1.setAttribute("x1", t1x - 4);
    tick1.setAttribute("y1", t1y - 4);
    tick1.setAttribute("x2", t1x + 4);
    tick1.setAttribute("y2", t1y + 4);
  }

  const t2x = midX + (panelEntryX - midX) * 0.5;
  const t2y = midY + (panelEntryY - midY) * 0.5;
  const tick2 = document.getElementById("ds-tick2");
  if (tick2) {
    tick2.setAttribute("x1", t2x - 4);
    tick2.setAttribute("y1", t2y);
    tick2.setAttribute("x2", t2x + 4);
    tick2.setAttribute("y2", t2y);
  }
}

// ── Cache le tooltip ──────────────────────────────
let onHideCallback = null;

export function setOnHideCallback(fn) {
  onHideCallback = fn;
}

export function hideDeadSpaceTooltip() {
  if (!overlay) return;
  overlay.style.display = "none";
  isVisible = false;
  if (onHideCallback) onHideCallback();
}

export function isTooltipVisible() {
  return isVisible;
}
