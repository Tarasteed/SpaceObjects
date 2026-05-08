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
Désormais hébergé sur Vercel : https://space-objects.vercel.app/

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

Textures téléchargées depuis [solarsystemscope.com/textures](https://www.solarsystemscope.com/textures).
Skybox : https://svs.gsfc.nasa.gov/4851

| Fichier | Objet |
|---|---|
| `8k_sun.jpg` | Soleil |
| `8k_mercury.jpg` | Mercure |
| `4k_venus_atmosphere.jpg` | Vénus (nuages) |
| `8k_venus_surface.jpg` | Vénus (surface) |
| `8k_earth_daymap.jpg` | Terre (jour) |
| `8k_earth_nightmap.jpg` | Terre (nuit — lumières humaines) |
| `8k_earth_clouds.jpg` | Terre (nuages) |
| `8k_mars.jpg` | Mars |
| `8k_jupiter.jpg` | Jupiter |
| `8k_saturn.jpg` | Saturne |
| `8k_saturn_ring_alpha.png` | Anneaux de Saturne |
| `2k_uranus.jpg` | Uranus |
| `2k_neptune.jpg` | Neptune |
| `8k_moon.jpg` | Lune |
| `starmap.jpg` | Skybox (carte du ciel NASA — [source](https://svs.gsfc.nasa.gov/4851)) |
| `lensflare0.png` | Halo du Soleil |
| `asteroid_c.jpg` | asteroid_c - Color [source](https://ambientcg.com/get?file=Rock026_1K-JPG.zip) |
| `asteroid_s.jpg` | asteroid_s - Color [source](https://ambientcg.com/get?file=Rock023_1K-JPG.zip) |
| `asteroid_m.jpg` | asteroid_m - Color [source](https://ambientcg.com/get?file=Rock032_1K-JPG.zip) |

---

## Objets affichés

| Type | Objets |
|---|---|
| Étoile | Soleil |
| Planètes | Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus, Neptune |
| Satellites naturels | Lune (orbite autour de la Terre) |

---

## Fonctionnalités implémentées

- Rendu 3D WebGL avec Three.js + post-processing bloom (UnrealBloomPass)
- Skybox photographique NASA (Voie Lactée)
- Étoiles générées procéduralement (4 types : rouges, jaunes, blanches, bleues)
- Orbites animées via pivots (`Object3D`) — pas de sin/cos manuel
- Inclinaisons orbitales et axiales réalistes (Vénus et Uranus rétrogrades)
- Éclairage réaliste depuis le Soleil (`PointLight` decay + lumière de remplissage)
- Shader de convection solaire (FBM noise, cellules chaudes/froides)
- Lens flare du Soleil (3 couches de sprites additifs)
- Anneaux de Saturne avec texture alpha et UV radiaux corrigés
- Atmosphères planétaires (sprites radial gradient additifs)
- Nuages Terre + atmosphère Vénus (sphère semi-transparente)
- Lumières humaines sur la partie sombre de la Terre (emissiveMap)
- Rotation libre de la caméra (OrbitControls)
- Zoom fluide vers une planète avec suivi en temps réel (lerp + delta)
- Navigation autour de la planète sélectionnée
- Retour vue système solaire
- Sidebar futuriste avec objets regroupés par type
- Infobulles au clic avec données scientifiques
- Contrôle pause / vitesse de simulation (×0 à ×10, défaut ×1.5)
- Afficher / masquer les orbites
- **Traînes orbitales** : dégradé vertex par vertex, longueur calée sur la vitesse angulaire réelle

---

## Branches

| Branche | Description |
|---|---|
| `main` | Version stable actuelle |
---

## Bugs connus

| Statut | Description |
|---|---|
| ✅ Résolu | Étoiles apparaissant en carrés au zoom |
| ✅ Résolu | Zoom ne suivant pas la planète en temps réel |
| ✅ Résolu | Dézoom bloqué après focus sur une planète |
| ✅ Résolu | Mauvais mapping pour les anneaux de Saturne |
| ✅ Résolu | Traînes orbitales dans le mauvais sens / décalées |
| ✅ Résolu | Impossible de déplacer la caméra autour de la planète dans certains cas |
|  | Petit snap en fin de zoom lié à la position de la planète qui a changé pendant le mouvement |
| [ ] | Au focus sur une planète, la caméra peut passer à travers au lieu de la suivre par l'extérieur |

---

## Roadmap

### Caméra & navigation
- ✅ Zoom fluide vers une planète avec suivi temps réel
- ✅ Orbiter autour de la planète sélectionnée
- ✅ Bouton retour vue système solaire
- ✅ Cliquer sur une planète dans la scène pour zoomer (raycasting)
- [ ] Dézoom progressif jusqu'à l'échelle de la galaxie

### Interface
- ✅ Contrôle pause / vitesse de simulation (×0 à ×10)
- ✅ Afficher / masquer les orbites
- [ ] Boutons d'échelle (système interne / complet / galaxie)
- [ ] Tooltip style Dead Space (UI 3D positionnée à côté de la planète)
- [ ] Panel d'options : orbiter autour de la planète OU se rapprocher

### Données
- [ ] Récupérer les données depuis NASA Horizons plutôt que data.js
- [ ] Sondes historiques (Voyager 1 & 2, New Horizons, Juno) via satellite.js
- ✅ Ceinture d'astéroïdes (entre Mars et Jupiter) V2 : Textures 
- [ ] Pluton et planètes naines

### Visuel
- ✅ Inclinaisons orbitales et axiales réalistes
- ✅ Skybox photographique NASA (Voie Lactée)
- ✅ Étoiles procédurales multi-couleurs en overlay
- ✅ Halo et lens flare du Soleil
- ✅ Scintillement du bloom solaire
- ✅ Shader de convection solaire (surface bouillonnante)
- ✅ Atmosphères planétaires
- ✅ Nuages Terre / atmosphère Vénus
- ✅ Lumières humaines sur la partie sombre de la Terre
- ✅ Textures 4k/8k
- ✅ Traînes orbitales (dégradé vertex, longueur proportionnelle à la vitesse)
- [ ] Raycasting — clic sur une planète pour zoomer
- [ ] Modèles 3D GLTF pour les sondes (NASA 3D Models)
- [ ] Anneaux d'Uranus (discrets mais réels)
- [ ] Fond de scène au zoom galaxie (Voie Lactée vue de loin)
- ❌ Ombres portées — rapport perf/rendu défavorable avec PointLight
- ❌ Halo lumineux autour de la Lune — artefact visuel indésirable
- ❌ Ombre des anneaux de Saturne sur la planète — trop coûteux

### Technique
- ✅ Hébergement Vercel (`npm run build` → dossier `dist/`)
- [ ] Optimisation performances mobile (LOD, réduction particules)
- [ ] PWA — installable sur mobile
- [ ] Mode plein écran

### Sound design
- [ ] Musique ambiante
- [ ] Effet sonor aux différents clique ?

---

## Notes de développement

**Pivots d'orbite**
Chaque planète est l'enfant d'un `Object3D` invisible placé au centre. Faire tourner le pivot autour de Y fait orbiter la planète sans calculer sin/cos manuellement. La Lune est enfant d'un `moonPivot` attaché au mesh Terre — elle hérite automatiquement de toutes ses transformations (position orbitale, rotation axiale).

**Traînes orbitales (vertexColors)**
Chaque orbite utilise un `BufferAttribute` de couleurs par vertex mis à jour à chaque frame. L'angle de la planète est lu directement depuis `pivot.rotation.y` (pas de `getWorldPosition` pour éviter les erreurs d'inclinaison). La conversion `planetAngle = -pivot.rotation.y` est nécessaire car la rotation Y Three.js est dans le sens opposé à la numérotation des vertices (antihoraire). La longueur de traîne est `BASE_TRAIL + angularVelocity * EXT_FRAMES` avec un minimum pour garder les planètes lentes visibles.

**Suivi caméra (mode following)**
En mode `following`, on calcule le delta de position de la planète entre deux frames et on déplace caméra + `controls.target` du même vecteur. La distance caméra/cible reste constante — OrbitControls ne dérive pas.

**Intensité lumière solaire**
Three.js r155+ utilise des unités physiques (candelas). `PointLight(0xfffde0, 400, 0, 2.3)` avec une lumière de remplissage `(0xfffde0, 0.4, 0, 0)` pour les planètes lointaines.

**Textures et Vite**
Les textures doivent être dans `public/` et non `src/`. Vite sert `public/` à la racine — accessibles via `/textures/fichier.jpg` sans chemin relatif.

**`data.js` — source de vérité unique**
Chaque objet spatial concentre toutes ses données (3D, UI, orbite) dans un seul objet. `main.js` dérive `planetsData`, `sunData` et `moonData` par filtrage de `OBJECTS`. Ajouter un objet = une entrée dans `OBJECTS`, rien d'autre à modifier.