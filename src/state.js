// #region ── État global de la simulation ─────────────────────────────────────

// Importé par main.js (lecture dans la boucle) et ui.js (écriture via les boutons HUD).
export const sim = {
  paused: false,
  speedFactor: 0.5,
  speedBeforePause: 0.5, // ← mémorise la vitesse avant la pause
};

// #endregion
