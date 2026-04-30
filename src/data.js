export const OBJECTS = [
  // ── Étoiles ──────────────────────────────────
  {
    id: "sun",
    name: "Soleil",
    type: "star",
    color: "#F9CB42",
    desc: "Notre étoile, âgée de 4,6 milliards d'années. Elle représente 99,8 % de la masse du système solaire.",
    facts: {
      distance: "Centre",
      rayon: "696 340 km",
      type: "Naine jaune (G2V)",
    },
  },
  // ── Planètes ──────────────────────────────────
  {
    id: "mercury",
    name: "Mercure",
    type: "planet",
    color: "#b4b2a9",
    desc: "La plus petite planète du système solaire. Sans atmosphère protectrice, les températures varient de -180°C à 430°C.",
    facts: {
      distance: "77M km du Soleil",
      rayon: "2 439 km",
      orbite: "88 jours",
    },
  },
  {
    id: "venus",
    name: "Vénus",
    type: "planet",
    color: "#F0997B",
    desc: "La planète la plus chaude (465°C). Tourne à l'envers et une journée vénusienne dure plus longtemps qu'une année.",
    facts: {
      distance: "108M km du Soleil",
      rayon: "6 051 km",
      orbite: "225 jours",
    },
  },
  {
    id: "earth",
    name: "Terre",
    type: "planet",
    color: "#378ADD",
    desc: "La seule planète connue abritant la vie. Son champ magnétique la protège des vents solaires.",
    facts: {
      distance: "150M km du Soleil",
      rayon: "6 371 km",
      orbite: "365 jours",
    },
  },
  {
    id: "mars",
    name: "Mars",
    type: "planet",
    color: "#D85A30",
    desc: "La Planète Rouge. Olympus Mons (22 km) est le plus grand volcan du système solaire.",
    facts: {
      distance: "228M km du Soleil",
      rayon: "3 389 km",
      orbite: "687 jours",
    },
  },
  {
    id: "jupiter",
    name: "Jupiter",
    type: "planet",
    color: "#EF9F27",
    desc: "La plus grande planète, 11× le diamètre terrestre. Sa Grande Tache Rouge est une tempête vieille de 350 ans.",
    facts: {
      distance: "778M km du Soleil",
      rayon: "69 911 km",
      orbite: "12 ans",
    },
  },
  {
    id: "saturn",
    name: "Saturne",
    type: "planet",
    color: "#FAC775",
    desc: "Ses anneaux sont composés de glace et de roches. Sa densité est si faible qu'elle flotterait sur l'eau.",
    facts: {
      distance: "1,4 Md km du Soleil",
      rayon: "58 232 km",
      orbite: "29 ans",
    },
  },
  {
    id: "uranus",
    name: "Uranus",
    type: "planet",
    color: "#9FE1CB",
    desc: "Tourne sur le côté avec une inclinaison de 98°. Découverte par William Herschel en 1781.",
    facts: {
      distance: "2,9 Md km du Soleil",
      rayon: "25 362 km",
      orbite: "84 ans",
    },
  },
  {
    id: "neptune",
    name: "Neptune",
    type: "planet",
    color: "#5b8ff9",
    desc: "Vents jusqu'à 2 100 km/h. Découverte en 1846 par calcul mathématique avant toute observation.",
    facts: {
      distance: "4,5 Md km du Soleil",
      rayon: "24 622 km",
      orbite: "165 ans",
    },
  },
  // ── Satellites ────────────────────────────────
  {
    id: "moon",
    name: "Lune",
    type: "satellite",
    color: "#c8d0e8",
    desc: "Seul satellite naturel de la Terre. Stabilise l'axe de rotation terrestre et crée les marées.",
    facts: {
      distance: "384 400 km de la Terre",
      rayon: "1 737 km",
      orbite: "27 jours",
    },
  },
];

// Regroupement par type pour la sidebar
export const TYPE_LABELS = {
  star: { label: "Étoiles", color: "#F9CB42" },
  planet: { label: "Planètes", color: "#5b8ff9" },
  satellite: { label: "Satellites", color: "#5DCAA5" },
  probe: { label: "Sondes", color: "#F5C4B3" },
};
