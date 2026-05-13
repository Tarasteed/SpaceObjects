import * as THREE from "three";

// #region ── LoadingManager partagé ───────────────────────────────────────────

// Exporté et importé par objects.js (TextureLoader) et main.js (callbacks onLoad/onProgress).
export const loadingManager = new THREE.LoadingManager();
export const loader = new THREE.TextureLoader(loadingManager);

loadingManager.onProgress = (url, loaded, total) => {
  const btn = document.getElementById("splash-btn");
  if (btn)
    btn.textContent = `Chargement... ${Math.round((loaded / total) * 100)}%`;
};

loadingManager.onLoad = () => {
  const btn = document.getElementById("splash-btn");
  if (btn) {
    btn.textContent = "▶ Explorer";
    btn.disabled = false;
  }
};

// #endregion
