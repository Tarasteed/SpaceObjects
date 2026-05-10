import * as THREE from "three";

export const loadingManager = new THREE.LoadingManager();
export const loader = new THREE.TextureLoader(loadingManager);

// Callbacks ici — exécutés avant tout chargement
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
