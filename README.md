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
# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

---

## Structure du projet

```
SpaceObjects/
├── public/
│   └── textures/           ← Textures JPG des planètes
├── src/
│   ├── main.js             ← Point d'entrée, boucle d'animation
│   ├── scene.js            ← Renderer, caméra, lumières, OrbitControls
│   ├── objects.js          ← Création des sphères 3D et anneaux
│   ├── camera.js           ← Animations caméra (zoom, lerp)
│   ├── ui.js               ← Sidebar, infobulles, boutons
│   ├── data.js             ← Données des objets spatiaux
│   └── style.css           ← Mise en page canvas + UI futuriste
├── index.html
└── package.json
```

---

## Textures

Textures 2K téléchargées depuis [solarsystemscope.com/textures](https://www.solarsystemscope.com/textures).

Fichiers utilisés dans `public/textures/` :

- `2k_sun.jpg`
- `2k_mercury.jpg`
- `2k_venus_atmosphere.jpg`
- `2k_earth_daymap.jpg`
- `2k_mars.jpg`
- `2k_jupiter.jpg`
- `2k_saturn.jpg`
- `2k_saturn_ring_alpha.png`
- `2k_uranus.jpg`
- `2k_neptune.jpg`
- `2k_moon.jpg`

---

## Objets actuellement affichés

**Étoiles**
- Soleil

**Planètes**
- Mercure, Vénus, Terre, Mars, Jupiter, Saturne (avec anneaux), Uranus, Neptune

**Satellites naturels**
- Lune (orbite autour de la Terre)

---

## Fonctionnalités implémentées

- Rendu 3D WebGL avec Three.js
- Orbites animées avec pivot (`Object3D`)
- Rotation libre de la caméra (OrbitControls)
- Éclairage réaliste depuis le Soleil (`PointLight` + `MeshBasicMaterial` pour le Soleil)
- Sidebar futuriste avec objets regroupés par type
- Infobulles au clic avec données historiques
- Zoom fluide sur une planète (interpolation `lerp`)
- Bouton retour vue système solaire

---

## Bugs connus

- [ ] **Étoiles de fond** — générées aléatoirement, certaines apparaissent trop proches et se voient sous forme de pixels blancs au zoom sur une planète
- [X] **Zoom dynamique** — le zoom sur une planète ne suit pas sa position en temps réel (la planète continue de tourner pendant le zoom)
- [X] **Dézoom bloqué** — bug empêchant le dézoom après un focus sur une planète

---

## Roadmap

### Caméra & navigation
- [X] Orbiter autour de la planète sélectionnée (recentrer `OrbitControls` sur elle) ou simplement se rapprocher
- [ ] Dézoom progressif jusqu'à l'échelle de la galaxie

### Interface
- [X] Contrôle pause / vitesse de simulation
- [ ] Planètes cliquables  (même action que le clique sur les éléments de la barre latérale)
- [ ] Afficher / masquer les orbites
- [ ] Boutons d'échelle (système interne / système complet / galaxie)
- [ ] Tooltip en style Dead Space (UI 3D positionnée à côté de la planète dans la scène) vs coin fixe — à décider

### Données
- [ ] Récupérer les données depuis une API plutôt que `data.js` (ex: NASA Horizons)
- [ ] Ajouter les sondes historiques (Voyager 1 & 2, New Horizons, Juno…) avec positions réelles via TLE / satellite.js

### Visuel
- [ ] Fond de scène — étoiles générées avec différentes couleurs, Voie Lactée, ou skybox photographique ?
    => [X] Pour le moment, différentes taille et couleurs + opacité diminuée si on en approche trop
    => [X] Tentative d'ajout de "Nébuleuse", trop ressemblante à des étoiles, voir pour utiliser une texture en ligne ? une Skybox comme indiqué dans la tache principale ?
- [ ] Modèles 3D GLTF pour les sondes et satellites (NASA 3D Models)
- [ ] Atmosphères planétaires (shader de halo)
    => [En cours] Nébuleuse volumétriques en test
- [ ] Brume particule autour du soleil ?
- [ ] Nuages Terre (seconde sphère semi-transparente)

### Technique
- [ ] Hébergement (Vercel ou Netlify — build `dist/` prêt)

---

## Notes de développement

**Pourquoi des pivots pour les orbites ?**
Chaque planète est l'enfant d'un `Object3D` invisible placé au centre. Faire tourner le pivot fait orbiter la planète sans calculer manuellement sin/cos. La Lune est enfant d'un pivot attaché à la Terre — elle hérite de toutes ses transformations.

**Intensité de la lumière solaire**
Three.js r155+ utilise des unités physiques (candelas). Une intensité de 200 avec portée 1000 donne un bon résultat sur cette scène. Ajuste selon ta version et l'échelle.

**Textures sans serveur**
Les textures doivent être dans `public/` et non `src/` — Vite sert `public/` à la racine, elles sont accessibles via `/textures/fichier.jpg`.