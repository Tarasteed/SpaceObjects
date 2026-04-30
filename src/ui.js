import { OBJECTS, TYPE_LABELS } from "./data.js";

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
