# 3D Space Objects

> Visualisation interactive du système solaire en 3D, construite avec Three.js et Vite.

🔗 [space-objects.vercel.app](https://space-objects.vercel.app) · [GitHub](https://github.com/Tarasteed/SpaceObjects)

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
│   ├── textures/        ← Textures JPG/PNG des planètes + skybox
│   ├── audio/           ← Musique et effets sonores
│   ├── favicon.svg      ← Favicon SVG
│   └── logo.svg         ← Logo animé (splash screen)
├── src/
│   ├── main.js          ← Point d'entrée, boucle d'animation, étoiles, skybox
│   ├── scene.js         ← Renderer, caméra, lumières, OrbitControls
│   ├── objects.js       ← Création des sphères 3D et anneaux
│   ├── camera.js        ← Animations caméra (zoom lerp, suivi planète)
│   ├── ui.js            ← Sidebar, infobulles, boutons HUD
│   ├── data.js          ← Source de vérité : données 3D + UI de chaque objet
│   ├── state.js         ← État global de la simulation (pause, vitesse)
│   ├── audio.js         ← Musique ambiante + effets sonores
│   ├── loader.js        ← LoadingManager Three.js partagé
│   └── style.css        ← Mise en page canvas + UI futuriste
├── index.html
└── package.json
```

---

## Textures

Textures téléchargées depuis [solarsystemscope.com/textures](https://www.solarsystemscope.com/textures).
Pluton : [planet-texture-maps.fandom.com/wiki/Pluto](https://planet-texture-maps.fandom.com/wiki/Pluto)
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
| `4k_pluto.jpg` | Pluton |
| `4k_eris.jpg` | Éris |
| `4k_haumea.jpg` | Hauméa |
| `4k_makemake.jpg` | Makemake |
| `starmap.jpg` | Skybox (carte du ciel NASA — [source](https://svs.gsfc.nasa.gov/4851)) |
| `lensflare0.png` | Halo du Soleil |
| `asteroid_c.jpg` | C-type — [source](https://ambientcg.com/get?file=Rock026_1K-JPG.zip) |
| `asteroid_s.jpg` | S-type — [source](https://ambientcg.com/get?file=Rock023_1K-JPG.zip) |
| `asteroid_m.jpg` | M-type — [source](https://ambientcg.com/get?file=Rock032_1K-JPG.zip) |

---

## Crédits

| Ressource | Auteur | Licence |
|---|---|---|
| Musique "Celestial" | [Scott Buckley](https://www.scottbuckley.com.au) | CC BY 4.0 |
| Textures planètes | [Solar System Scope](https://www.solarsystemscope.com/textures) | CC BY 4.0 |
| Skybox | [NASA SVS](https://svs.gsfc.nasa.gov/4851) | Domaine public |
| Textures astéroïdes | [ambientCG](https://ambientcg.com) | CC0 |

---

## Objets affichés

| Type | Objets |
|---|---|
| Étoile | Soleil |
| Planètes | Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus, Neptune |
| Satellites naturels | Lune |
| Ceinture | Ceinture d'astéroïdes (entre Mars et Jupiter) |
| Planètes naines | Pluton, Éris, Hauméa, Makemake |

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
- Ceinture d'astéroïdes procédurale (InstancedMesh, 3 types C/S/M, loi de Kepler)
- Pluton et planètes naines à l'échelle (Éris, Hauméa, Makemake)
- Zoom fluide vers une planète avec suivi en temps réel (lerp)
- Navigation autour de la planète sélectionnée (drag + zoom molette)
- Clic sur une planète dans la scène pour zoomer (raycasting)
- Vue dédiée ceinture d'astéroïdes depuis la sidebar
- Retour vue système solaire + touche Échap
- Sidebar futuriste repliable avec objets regroupés par type + lien GitHub
- Infobulles au clic avec données scientifiques + vitesse orbitale réelle (km/s) en temps réel
- Tooltip réductible via bouton toggle — libère la surface de visualisation sur mobile
- Contrôle pause / vitesse de simulation (×0 à ×20, défaut ×0.5)
- Mettre la vitesse à ×0 équivaut à une mise en pause complète (sons inclus)
- Afficher / masquer les orbites
- Traînes orbitales — dégradé vertex par vertex, longueur calée sur la vitesse angulaire réelle
- Splash screen animé (logo SVG) avec barre de chargement — bouton Explorer débloqué à 100%
- Musique ambiante spatiale en boucle avec fondu d'entrée progressif
- Contrôle volume + pause/play musique dans le HUD
- Son atmosphérique suspendu/repris proprement lors de la pause ou vitesse ×0 de la simulation
- Crépitement ceinture d'astéroïdes suspendu/repris proprement lors de la pause ou vitesse ×0
- Animation du soleil et des étoiles suspendu/repris proprement lors de la pause ou vitesse ×0
- Ping sonar au clic sidebar / raycasting
- Swoosh au retour système solaire
- Favicon SVG + logo animé
- Interface mobile responsive (sidebar repliable, HUDs adaptatifs, tooltip réductible)

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
| ✅ Résolu | Son atmosphérique ne se relance pas en naviguant entre planètes |
| ✅ Résolu | HUDs sim/audio de largeurs différentes sur mobile |
| ✅ Résolu | Impossible de naviguer de planète en planète sans passer par la sidebar |
| ✅ Résolu | Sons contextuels qui redémarrent lors d'une navigation en pause |
| ✅ Résolu | Focus ceinture => pause => retour systeme => clique ceinture => play => plus de son |
| ✅ Résolu | Les etiquettes passent par-dessus la sidebar |
| ✅ Résolu | Tritton orbite en vague, surement à cause de l'axialTilt |
| ✅ Résolu | La vitesse de roation de Titan est identique à celle de Neptune |
| | Petit snap en fin de zoom lié au déplacement de la planète pendant le lerp |
| | La caméra peut traverser la planète au lieu de la suivre par l'extérieur |
| | Traînes des planètes naines légèrement en avance (vitesse trop faible pour la résolution vertex) |

---

## Roadmap

### Caméra & navigation
- ✅ Zoom fluide vers une planète avec suivi temps réel
- ✅ Orbiter autour de la planète sélectionnée
- ✅ Bouton retour vue système solaire
- ✅ Touche Échap pour revenir au système depuis n'importe où
- ✅ Cliquer sur une planète dans la scène pour zoomer (raycasting)
- ✅ Navigation de planète en planète sans repasser par la vue système
- [ ] Dézoom progressif jusqu'à l'échelle de la galaxie
- [ ] Zoom molette depuis la vue système vers une planète (sans clic) ?

### Interface
- ✅ Contrôle pause / vitesse de simulation (×0 à ×20)
- ✅ Vitesse ×0 équivalente à la pause (sons + comportement cohérent)
- ✅ Afficher / masquer les orbites
- ✅ Contrôle musique (volume + pause/play)
- ✅ Cliquer sur la ceinture d'astéroïdes dans la sidebar
- ✅ Lien GitHub dans la sidebar
- ✅ Sidebar repliable (desktop + mobile)
- ✅ Interface mobile responsive
- ✅ Tooltip réductible (bouton toggle − / +)
- ✅ Vitesse orbitale réelle dans la tooltip (mode suivi, jitter live)
- ✅ Curseur custom style HUD
- ✅ Afficher / masquer les étiquettes de planètes/lunes
- ✅ Au survol des items dans la sidebar, mettre en évidence la planète ciblée (Aura, pulse ?)
- ✅ Masquer tous les HUDs d'un coup (mode cinématique / plein écran propre) au double clique
- ✅ Zone indiquant les différents raccourcis clavier ajouté au splashscreen

- [ ] Boutons d'échelle (système interne / complet / galaxie)
- ❌ Tooltip style Dead Space — trop complexe avec suivi de planète en temps réel
- ❌ Panel orbiter / rapprocher — pas suffisamment utile

### Données
- ✅ Ceinture d'astéroïdes (entre Mars et Jupiter) — textures C/S/M-type
- ✅ Anneaux d'Uranus
- ✅ Pluton et planètes naines à l'échelle
- ✅ Vitesses orbitales réelles (km/s) dans data.js — source NASA Planetary Fact Sheets
- ✅ Lunes supplémentaires — Mars (Phobos, Deimos), Jupiter (Io, Europe, Ganymède, Callisto), Saturne (Titan) et Neptune (Triton)
- ✅ Liens Wikipedia/NASA dans la tooltip
- [ ] Ceinture de Kuiper

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
- ✅ Splash screen animé avec logo SVG + loader
- ✅ Favicon SVG
- ✅ Raycasting — clic sur une planète pour zoomer
- ✅ Logo indiquant qu'il faut porter un casque audio sur le spashscreen
- [ ] Fond de scène au zoom galaxie (Voie Lactée vue de loin)
- ❌ Ombres portées — rapport perf/rendu défavorable avec PointLight
- ❌ Halo lumineux autour de la Lune — artefact visuel indésirable
- ❌ Ombre des anneaux de Saturne sur la planète — trop coûteux

### Technique
- ✅ Hébergement Vercel (`npm run build` → dossier `dist/`)
- ✅ Splash screen avec LoadingManager — bouton bloqué jusqu'au chargement complet
- ✅ LoadingManager partagé via `loader.js` (évite les imports circulaires)
- ✅ Optimisation mobile (sidebar repliable, HUDs adaptatifs)
- ✅ Enum `CameraMode` pour les états caméra
- [ ] Optimisation performances mobile (LOD, réduction particules)
- [ ] PWA — installable sur mobile

### Sound design
- ✅ Musique ambiante spatiale (Scott Buckley — "Celestial", CC BY 4.0)
- ✅ Hum atmosphérique en mode suivi de planète avec atmosphère
- ✅ Hum atmosphérique suspendu/repris proprement à la pause et vitesse ×0
- ✅ Crépitement ceinture d'astéroïdes suspendu/repris proprement à la pause et vitesse ×0
- ✅ Ping sonar au clic sidebar / raycasting
- ✅ Swoosh retour système solaire
- [ ] Volume hum atmosphérique variable selon distance à la planète ?
- [ ] Son différencié selon type de planète (gazeuse / rocheuse / naine) ?
- ❌ Whoosh zoom vers planète — trop difficile à timer correctement

### BONUS
- [ ] Modèles 3D GLTF pour les sondes (NASA 3D Models)
- [ ] Récupérer les données depuis NASA Horizons plutôt que data.js
- [ ] Sondes historiques (Voyager 1 & 2, New Horizons, Juno) via satellite.js

---

## Notes de développement

**Pivots d'orbite**
Chaque planète est l'enfant d'un `Object3D` invisible placé au centre. Faire tourner le pivot autour de Y fait orbiter la planète sans calculer sin/cos manuellement. La Lune est enfant d'un `moonPivot` attaché au mesh Terre — elle hérite automatiquement de toutes ses transformations.

**Traînes orbitales (vertexColors)**
Chaque orbite utilise un `BufferAttribute` de couleurs par vertex mis à jour à chaque frame. La conversion `planetAngle = -pivot.rotation.y` est nécessaire car la rotation Y Three.js est dans le sens opposé à la numérotation des vertices. La longueur de traîne est `BASE_TRAIL + angularVelocity * EXT_FRAMES`. Les orbites lointaines (r > 70) utilisent 4096 segments au lieu de 512 pour réduire l'effet de saccade sur les planètes naines.

**Ceinture d'astéroïdes (InstancedMesh)**
3 `InstancedMesh` (un par type C/S/M) — 1 draw call par type quelle que soit la quantité. Vitesses keplériennes (`v ∝ 1/√r`), ellipticité individuelle, distribution logarithmique des tailles. `MeshBasicMaterial` pour s'affranchir de la distance à la `PointLight` solaire.

**Suivi caméra (mode following)**
`OrbitControls` est `dispose()` en mode following. La position caméra est calculée manuellement via `THREE.Spherical` — drag et zoom molette sont gérés par des listeners canvas dédiés. `setSkipControlsUpdate(true)` empêche `controls.update()` d'écraser la position.

**Gestion audio pause/vitesse**
Les sons contextuels (atmo, ceinture) sont suspendus via `pause()` / `audioCtx.suspend()` plutôt que stoppés — la reprise est instantanée et sans recréation de source. Un helper `isSimStopped()` centralise la vérification `sim.paused || sim.speedFactor === 0` pour traiter les deux états d'arrêt de façon cohérente.

**Vitesse orbitale live (tooltip)**
`obj.speedKms` dans `data.js` stocke la valeur réelle NASA (km/s). `updateTooltipSpeed()` dans `ui.js` applique un jitter de ±0.06 km/s par frame sur l'élément `#tt-speed-live` pour simuler une mesure de télémétrie en direct — sans reconstruire le DOM de la tooltip.

**Sidebar repliable**
La fonction `updateSidebarDependents(isCollapsed)` dans `ui.js` met à jour dynamiquement la position de `#btn-orbits`, `#sim-hud`, `#audio-hud` et `#tooltip` selon l'état de la sidebar et la taille d'écran. Un listener `resize` resynchronise automatiquement les positions desktop/mobile au redimensionnement.

**LoadingManager partagé**
`loader.js` exporte un `TextureLoader` et un `LoadingManager` uniques. Évite l'import circulaire `main.js ↔ objects.js` en centralisant le loader dans un module tiers.

**Intensité lumière solaire**
Three.js r155+ utilise des unités physiques. `PointLight(0xfffde0, 400, 0, 2.3)` + lumière de remplissage `(0xfffde0, 0.4, 0, 0)` pour les planètes lointaines.

**Textures et Vite**
Les textures doivent être dans `public/` — Vite sert ce dossier à la racine, accessibles via `/textures/fichier.jpg` sans chemin relatif.
