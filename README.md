# 3D Space Objects

Visualisation interactive du système solaire en 3D, construite avec Three.js et Vite.

---

## Stack technique

| Outil | Rôle |
|---|---|
| [Vite](https://vitejs.dev) | Serveur de développement + bundler |
| [Three.js](https://threejs.org) | Moteur 3D WebGL |
| [satellite.js](https://github.com/shashwatak/satellite-js) | Propagation orbitale TLE (prévu) |

---

## Installation

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173` dans le navigateur.

```bash
npm run build    # Build de production → dossier dist/
npm run preview  # Prévisualiser le build en local
```

---

## Structure du projet

```
SpaceObjects/
├── public/
│   └── textures/        ← Textures JPG/PNG des planètes + skybox
├── src/
│   ├── main.js          ← Point d'entrée, boucle d'animation, étoiles, skybox
│   ├── scene.js         ← Renderer, caméra, lumières, OrbitControls
│   ├── objects.js       ← Création des sphères 3D et anneaux
│   ├── camera.js        ← Animations caméra (zoom lerp, suivi planète)
│   ├── ui.js            ← Sidebar, infobulles, boutons HUD
│   ├── data.js          ← Source de vérité : données 3D + UI de chaque objet
│   ├── state.js         ← État global de la simulation (pause, vitesse)
│   └── style.css        ← Mise en page canvas + UI futuriste
├── index.html
└── package.json
```

---

## Textures

Textures 2K téléchargées depuis [solarsystemscope.com/textures](https://www.solarsystemscope.com/textures).

| Fichier | Objet |
|---|---|
| `2k_sun.jpg` | Soleil |
| `2k_mercury.jpg` | Mercure |
| `2k_venus_atmosphere.jpg` | Vénus |
| `2k_earth_daymap.jpg` | Terre |
| `2k_mars.jpg` | Mars |
| `2k_jupiter.jpg` | Jupiter |
| `2k_saturn.jpg` | Saturne |
| `2k_saturn_ring_alpha.png` | Anneaux de Saturne |
| `2k_uranus.jpg` | Uranus |
| `2k_neptune.jpg` | Neptune |
| `2k_moon.jpg` | Lune |
| `starmap.jpg` | Skybox (carte du ciel NASA — [source](https://svs.gsfc.nasa.gov/4851)) |

---

## Objets affichés

| Type | Objets |
|---|---|
| Étoile | Soleil |
| Planètes | Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus, Neptune |
| Satellites naturels | Lune (orbite autour de la Terre) |

---

## Fonctionnalités implémentées

- Rendu 3D WebGL avec Three.js
- Skybox photographique NASA (Voie Lactée)
- Étoiles générées procéduralement (4 types : rouges, jaunes, blanches, bleues)
- Orbites animées via pivots (`Object3D`)
- Rotations axiales réalistes (Vénus et Uranus rétrogrades)
- Éclairage réaliste depuis le Soleil (`PointLight` + `MeshBasicMaterial` émissif)
- Anneaux de Saturne avec texture alpha
- Rotation libre de la caméra (OrbitControls)
- Zoom fluide sur une planète avec suivi en temps réel (`lerp` + delta)
- Navigation autour de la planète sélectionnée
- Retour vue système solaire
- Sidebar futuriste avec objets regroupés par type
- Infobulles au clic avec données historiques
- Contrôle pause / vitesse de simulation (×0.01 à ×2)

---

## Branches

| Branche | Description |
|---|---|
| `main` | Version stable actuelle |
| `stars-nebula` | Tentative nébuleuse volumétrique (particules) |
| `feature/skybox-stars` | Skybox NASA + étoiles procédurales |

---

## Bugs connus

| Statut | Description |
|---|---|
| ✅ Résolu | Étoiles apparaissant en carrés au zoom |
| ✅ Résolu | Zoom ne suivant pas la planète en temps réel |
| ✅ Résolu | Dézoom bloqué après focus sur une planète |

---

## Roadmap

### Caméra & navigation
- [x] Zoom fluide vers une planète avec suivi temps réel
- [x] Orbiter autour de la planète sélectionnée
- [x] Bouton retour vue système solaire
- [ ] Dézoom progressif jusqu'à l'échelle de la galaxie

### Interface
- [x] Contrôle pause / vitesse de simulation
- [ ] Planètes cliquables directement dans la scène (raycasting)
- [ ] Afficher / masquer les orbites
- [ ] Boutons d'échelle (système interne / complet / galaxie)
- [ ] Tooltip style Dead Space (UI 3D positionnée à côté de la planète)

### Données
- [ ] Récupérer les données depuis une API (ex: NASA Horizons) plutôt que `data.js`
- [ ] Ajouter les sondes historiques (Voyager 1 & 2, New Horizons, Juno) avec positions réelles via satellite.js

### Visuel
- [x] Skybox photographique NASA (Voie Lactée)
- [x] Étoiles procédurales multi-couleurs en overlay
- [ ] Atmosphères planétaires (shader de halo)
- [ ] Nuages Terre (seconde sphère semi-transparente)
- [ ] Brume / halo autour du Soleil
- [ ] Modèles 3D GLTF pour les sondes (NASA 3D Models)

### Technique
- [ ] Hébergement (Vercel ou Netlify — `npm run build` génère le dossier `dist/`)

---

## Notes de développement

**Pivots d'orbite**
Chaque planète est l'enfant d'un `Object3D` invisible placé au centre. Faire tourner le pivot fait orbiter la planète sans calculer sin/cos manuellement. La Lune est enfant d'un pivot attaché à la Terre — elle hérite automatiquement de ses transformations.

**Suivi caméra (mode following)**
En mode `following`, on calcule le delta de position de la planète entre deux frames et on déplace caméra + `controls.target` du même vecteur. La distance caméra/cible reste constante — OrbitControls ne dérive pas.

**Intensité lumière solaire**
Three.js r155+ utilise des unités physiques (candelas). Une intensité de 200 avec portée 1000 fonctionne bien sur cette scène. Ajuste selon ta version et l'échelle de la scène.

**Textures et Vite**
Les textures doivent être dans `public/` et non `src/`. Vite sert `public/` à la racine — elles sont accessibles via `/textures/fichier.jpg` sans chemin relatif.

**`data.js` — source de vérité unique**
Chaque objet spatial concentre toutes ses données (3D, UI, orbite) dans un seul objet. `main.js` dérive `planetsData`, `sunData` et `moonData` par filtrage de `OBJECTS`.