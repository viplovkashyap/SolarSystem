/* ------------------------------------------------------------------ */
/*  HELIOS data architecture — all astronomy content lives here,       */
/*  fully separated from rendering logic.                              */
/* ------------------------------------------------------------------ */

export type BodyType = "star" | "planet" | "dwarf" | "moon" | "comet" | "spacecraft";

export interface CelestialBody {
  id: string;
  name: string;
  type: BodyType;
  radiusKm: number;
  massLabel: string;
  gravityLabel: string;
  /** semi-major axis in AU (heliocentric) */
  a: number;
  e: number;
  periodDays: number;
  rotationHours: number;
  tiltDeg: number;
  inclinationDeg: number;
  /** mean longitude at J2000 epoch, degrees */
  L0: number;
  tempLabel: string;
  moonCount: number;
  atmosphere: string;
  surface: string;
  color: string;
  description: string;
  facts: string[];
  distLabel: string;
  dayLabel: string;
  yearLabel: string;
  /** moons only */
  parent?: string;
  orbitKm?: number;
}

export const BODIES: CelestialBody[] = [
  {
    id: "sun", name: "Sun", type: "star", radiusKm: 696340, massLabel: "1.989 × 10³⁰ kg",
    gravityLabel: "274 m/s²", a: 0, e: 0, periodDays: 0, rotationHours: 609.12, tiltDeg: 7.25,
    inclinationDeg: 0, L0: 0, tempLabel: "5,505 °C surface", moonCount: 0,
    atmosphere: "Corona · 1–3 million °C plasma", surface: "Churning plasma, sunspots, flares",
    color: "#ffb84d",
    description: "The G-type main-sequence star at the heart of the Solar System. Its gravity binds every planet, comet and asteroid in orbit, and its light takes 8 min 20 s to reach Earth.",
    facts: [
      "Contains 99.86 % of the Solar System's mass",
      "Fuses ~600 million tons of hydrogen every second",
      "Light from its surface is 8 min 20 s old by the time it reaches Earth",
      "Its core temperature reaches 15 million °C",
    ],
    distLabel: "0 km (center)", dayLabel: "25.4 Earth days", yearLabel: "230M yrs (galactic)",
  },
  {
    id: "mercury", name: "Mercury", type: "planet", radiusKm: 2439.7, massLabel: "3.30 × 10²³ kg",
    gravityLabel: "3.70 m/s²", a: 0.387, e: 0.2056, periodDays: 87.97, rotationHours: 1407.6,
    tiltDeg: 0.03, inclinationDeg: 7.0, L0: 252.25, tempLabel: "−173 to 427 °C", moonCount: 0,
    atmosphere: "Trace exosphere — He, Na, O", surface: "Heavily cratered silicate crust, lava plains",
    color: "#9c8e84",
    description: "The smallest planet and closest to the Sun. A year on Mercury lasts just 88 days, yet one solar day (sunrise to sunrise) spans 176 Earth days.",
    facts: [
      "Surface temperatures swing by 600 °C between day and night",
      "It has a huge iron core — about 85 % of its radius",
      "Ice survives in permanently shadowed polar craters",
      "Visited only twice: Mariner 10 and MESSENGER",
    ],
    distLabel: "57.9M km", dayLabel: "58.6 Earth days", yearLabel: "88 Earth days",
  },
  {
    id: "venus", name: "Venus", type: "planet", radiusKm: 6051.8, massLabel: "4.87 × 10²⁴ kg",
    gravityLabel: "8.87 m/s²", a: 0.723, e: 0.0068, periodDays: 224.7, rotationHours: -5832.5,
    tiltDeg: 177.4, inclinationDeg: 3.39, L0: 181.98, tempLabel: "464 °C average", moonCount: 0,
    atmosphere: "96.5 % CO₂ · sulfuric acid clouds · 92 bar", surface: "Volcanic plains, tessera highlands",
    color: "#e8c48a",
    description: "Earth's scorching twin. A runaway greenhouse effect beneath crushing carbon-dioxide clouds makes Venus the hottest planet — hotter even than Mercury.",
    facts: [
      "Rotates backwards — the Sun rises in the west",
      "A day on Venus is longer than its year",
      "Surface pressure equals being 900 m underwater on Earth",
      "Radar maps reveal over 1,600 major volcanoes",
    ],
    distLabel: "108.2M km", dayLabel: "243 Earth days", yearLabel: "224.7 Earth days",
  },
  {
    id: "earth", name: "Earth", type: "planet", radiusKm: 6371, massLabel: "5.97 × 10²⁴ kg",
    gravityLabel: "9.81 m/s²", a: 1.0, e: 0.0167, periodDays: 365.25, rotationHours: 23.93,
    tiltDeg: 23.44, inclinationDeg: 0.0, L0: 100.46, tempLabel: "15 °C average", moonCount: 1,
    atmosphere: "78 % N₂ · 21 % O₂ · 1 bar", surface: "Oceans (71 %), continents, ice caps, life",
    color: "#4f9df0",
    description: "The only world known to harbor life. Liquid-water oceans, a protective magnetic field and a stable atmosphere make Earth a pale blue dot unlike any other.",
    facts: [
      "The only planet not named after a deity",
      "Its magnetic field shields the surface from solar wind",
      "The Moon stabilises Earth's axial tilt and drives tides",
      "71 % of the surface is covered by ocean",
    ],
    distLabel: "149.6M km", dayLabel: "23 h 56 m", yearLabel: "365.25 days",
  },
  {
    id: "mars", name: "Mars", type: "planet", radiusKm: 3389.5, massLabel: "6.42 × 10²³ kg",
    gravityLabel: "3.71 m/s²", a: 1.524, e: 0.0934, periodDays: 686.98, rotationHours: 24.62,
    tiltDeg: 25.19, inclinationDeg: 1.85, L0: 355.45, tempLabel: "−63 °C average", moonCount: 2,
    atmosphere: "95 % CO₂ · 0.006 bar", surface: "Iron-oxide deserts, canyons, polar CO₂ caps",
    color: "#d1683f",
    description: "The red planet — home to the tallest volcano and deepest canyon in the Solar System. Robotic explorers currently roam its deserts searching for signs of ancient life.",
    facts: [
      "Olympus Mons stands 21.9 km high — 2.5 × Everest",
      "Valles Marineris stretches 4,000 km across the equator",
      "Its red colour comes from iron-oxide dust",
      "Sunsets on Mars appear blue",
    ],
    distLabel: "227.9M km", dayLabel: "24 h 37 m", yearLabel: "687 Earth days",
  },
  {
    id: "jupiter", name: "Jupiter", type: "planet", radiusKm: 69911, massLabel: "1.90 × 10²⁷ kg",
    gravityLabel: "24.79 m/s²", a: 5.203, e: 0.0489, periodDays: 4332.6, rotationHours: 9.93,
    tiltDeg: 3.13, inclinationDeg: 1.3, L0: 34.4, tempLabel: "−108 °C cloud tops", moonCount: 95,
    atmosphere: "90 % H₂ · 10 % He · ammonia clouds", surface: "No solid surface — metallic hydrogen interior",
    color: "#d8b48a",
    description: "The giant of the Solar System — more than twice as massive as all other planets combined. Its Great Red Spot is a storm wider than Earth that has raged for centuries.",
    facts: [
      "The fastest spinning planet — a day lasts under 10 hours",
      "The Great Red Spot has been observed since at least 1831",
      "Its moon Ganymede is larger than the planet Mercury",
      "Acts as a gravitational shield, deflecting comets inward or outward",
    ],
    distLabel: "778.5M km", dayLabel: "9 h 56 m", yearLabel: "11.9 Earth years",
  },
  {
    id: "saturn", name: "Saturn", type: "planet", radiusKm: 58232, massLabel: "5.68 × 10²⁶ kg",
    gravityLabel: "10.44 m/s²", a: 9.537, e: 0.0565, periodDays: 10759, rotationHours: 10.7,
    tiltDeg: 26.73, inclinationDeg: 2.49, L0: 49.94, tempLabel: "−139 °C cloud tops", moonCount: 146,
    atmosphere: "96 % H₂ · 3 % He · ammonia haze", surface: "No solid surface — possible helium rain",
    color: "#e3cf9f",
    description: "The jewel of the Solar System, wrapped in a dazzling ring system made of countless shards of ice and rock — some as small as dust, others as large as mountains.",
    facts: [
      "Its rings span 280,000 km but are only ~10 m thick",
      "Saturn is less dense than water — it would float",
      "Hexagonal storm at its north pole spans 30,000 km",
      "Moon Titan has rivers and lakes of liquid methane",
    ],
    distLabel: "1.43B km", dayLabel: "10 h 42 m", yearLabel: "29.4 Earth years",
  },
  {
    id: "uranus", name: "Uranus", type: "planet", radiusKm: 25362, massLabel: "8.68 × 10²⁵ kg",
    gravityLabel: "8.87 m/s²", a: 19.19, e: 0.0457, periodDays: 30687, rotationHours: -17.24,
    tiltDeg: 97.77, inclinationDeg: 0.77, L0: 313.23, tempLabel: "−197 °C", moonCount: 28,
    atmosphere: "H₂, He, methane — methane gives blue-green tint", surface: "Ice giant — water, methane & ammonia ices",
    color: "#9adfe3",
    description: "An ice giant knocked onto its side — Uranus rolls around the Sun with a 98° axial tilt, giving each pole 42 years of daylight followed by 42 years of night.",
    facts: [
      "Tilted 98° — likely from an ancient colossal impact",
      "Coldest planetary atmosphere measured: −224 °C",
      "Its faint rings were discovered in 1977 by stellar occultation",
      "Named after the Greek sky deity Ouranos",
    ],
    distLabel: "2.87B km", dayLabel: "17 h 14 m", yearLabel: "84 Earth years",
  },
  {
    id: "neptune", name: "Neptune", type: "planet", radiusKm: 24622, massLabel: "1.02 × 10²⁶ kg",
    gravityLabel: "11.15 m/s²", a: 30.07, e: 0.0113, periodDays: 60190, rotationHours: 16.11,
    tiltDeg: 28.32, inclinationDeg: 1.77, L0: 304.88, tempLabel: "−201 °C", moonCount: 16,
    atmosphere: "H₂, He, methane · supersonic winds", surface: "Ice giant — dynamic, stormy cloud decks",
    color: "#4666e0",
    description: "The most distant planet, lashed by the fastest winds in the Solar System — over 2,000 km/h. Found by mathematics before it was ever seen through a telescope.",
    facts: [
      "Discovered in 1846 from gravitational predictions",
      "Winds reach 2,100 km/h — 1.6 × the speed of sound",
      "Its moon Triton orbits backwards and may be a captured Kuiper object",
      "One Neptune year equals 165 Earth years",
    ],
    distLabel: "4.50B km", dayLabel: "16 h 6 m", yearLabel: "164.8 Earth years",
  },
  {
    id: "pluto", name: "Pluto", type: "dwarf", radiusKm: 1188.3, massLabel: "1.30 × 10²² kg",
    gravityLabel: "0.62 m/s²", a: 39.48, e: 0.2488, periodDays: 90560, rotationHours: -153.3,
    tiltDeg: 122.5, inclinationDeg: 17.16, L0: 238.93, tempLabel: "−229 °C", moonCount: 5,
    atmosphere: "Trace N₂, CH₄, CO — collapses when far", surface: "Nitrogen-ice glaciers, mountains of water ice",
    color: "#c9a98b",
    description: "The beloved dwarf planet of the Kuiper Belt. New Horizons revealed a startlingly active world with a heart-shaped nitrogen glacier and blue hazes.",
    facts: [
      "Tombaugh Regio — 'the heart' — is a 1,600 km nitrogen glacier",
      "Reclassified as a dwarf planet in 2006",
      "Its moon Charon is half Pluto's size — a double system",
      "Has blue skies: sunlight scatters in its haze layers",
    ],
    distLabel: "5.91B km avg", dayLabel: "6.4 Earth days", yearLabel: "248 Earth years",
  },
  {
    id: "ceres", name: "Ceres", type: "dwarf", radiusKm: 469.7, massLabel: "9.38 × 10²⁰ kg",
    gravityLabel: "0.28 m/s²", a: 2.767, e: 0.0758, periodDays: 1681.6, rotationHours: 9.07,
    tiltDeg: 4.0, inclinationDeg: 10.6, L0: 150.0, tempLabel: "−106 °C average", moonCount: 0,
    atmosphere: "Transient water-vapor vents", surface: "Cratered icy-rock crust, bright salt deposits",
    color: "#8b8578",
    description: "The largest object in the asteroid belt and the only dwarf planet of the inner Solar System. Dawn found bright salt flats in Occator Crater — hints of briny water.",
    facts: [
      "Contains about one third of the asteroid belt's mass",
      "Occator Crater's bright spots are sodium-carbonate salts",
      "May hide a briny ocean beneath its crust",
      "First asteroid ever discovered — 1801",
    ],
    distLabel: "413.9M km", dayLabel: "9 h 4 m", yearLabel: "4.6 Earth years",
  },
  /* ------------------------------- MOONS ------------------------------- */
  {
    id: "moon", name: "Moon", type: "moon", parent: "earth", orbitKm: 384400, radiusKm: 1737.4,
    massLabel: "7.35 × 10²² kg", gravityLabel: "1.62 m/s²", a: 0.00257, e: 0.0549, periodDays: 27.32,
    rotationHours: 655.7, tiltDeg: 6.68, inclinationDeg: 5.14, L0: 135, tempLabel: "−173 to 127 °C",
    moonCount: 0, atmosphere: "Ultra-thin exosphere", surface: "Anorthosite highlands, basalt maria, craters",
    color: "#c9c9d1",
    description: "Earth's only natural satellite, born from a giant impact 4.5 billion years ago. Its pull drives our tides and stabilises the planet's axial tilt.",
    facts: [
      "Drifts away from Earth by 3.8 cm every year",
      "12 people have walked on its surface",
      "The same face always points at Earth",
      "Its gravitational pull creates Earth's ocean tides",
    ],
    distLabel: "384,400 km from Earth", dayLabel: "27.3 Earth days", yearLabel: "27.3 days (around Earth)",
  },
  {
    id: "io", name: "Io", type: "moon", parent: "jupiter", orbitKm: 421700, radiusKm: 1821.6,
    massLabel: "8.93 × 10²² kg", gravityLabel: "1.80 m/s²", a: 0.00282, e: 0.0041, periodDays: 1.77,
    rotationHours: 42.5, tiltDeg: 0, inclinationDeg: 0.04, L0: 200, tempLabel: "−143 °C average",
    moonCount: 0, atmosphere: "Thin SO₂ from volcanoes", surface: "Sulfur plains, 400+ active volcanoes",
    color: "#e0c36a",
    description: "The most volcanically active body known. Tidal flexing from Jupiter keeps its interior molten, painting its surface in sulfurous yellows, reds and whites.",
    facts: [
      "Over 400 active volcanoes — plumes reach 500 km",
      "Surface is completely resurfaced every few million years",
      "Tidal heating from Jupiter powers the volcanism",
      "Named after a mythological lover of Zeus",
    ],
    distLabel: "421,700 km from Jupiter", dayLabel: "1.77 Earth days", yearLabel: "1.77 days",
  },
  {
    id: "europa", name: "Europa", type: "moon", parent: "jupiter", orbitKm: 671034, radiusKm: 1560.8,
    massLabel: "4.80 × 10²² kg", gravityLabel: "1.31 m/s²", a: 0.00449, e: 0.009, periodDays: 3.55,
    rotationHours: 85.2, tiltDeg: 0.1, inclinationDeg: 0.47, L0: 36, tempLabel: "−160 °C average",
    moonCount: 0, atmosphere: "Trace oxygen", surface: "Cracked water-ice shell, few craters",
    color: "#cbb89a",
    description: "Beneath its cracked icy shell lies a global saltwater ocean holding twice the water of Earth's seas — a prime target in the search for extraterrestrial life.",
    facts: [
      "Hidden ocean may be 60–150 km deep",
      "Surface is among the smoothest in the Solar System",
      "Europa Clipper arrives at Jupiter in 2030",
      "Reddish streaks may be salts from the ocean below",
    ],
    distLabel: "671,034 km from Jupiter", dayLabel: "3.55 Earth days", yearLabel: "3.55 days",
  },
  {
    id: "ganymede", name: "Ganymede", type: "moon", parent: "jupiter", orbitKm: 1070412, radiusKm: 2634.1,
    massLabel: "1.48 × 10²³ kg", gravityLabel: "1.43 m/s²", a: 0.00716, e: 0.0013, periodDays: 7.15,
    rotationHours: 171.7, tiltDeg: 0.2, inclinationDeg: 0.2, L0: 317, tempLabel: "−163 °C average",
    moonCount: 0, atmosphere: "Trace oxygen", surface: "Ancient dark terrain & grooved bright terrain",
    color: "#9a8f84",
    description: "The largest moon in the Solar System — bigger than Mercury — and the only one with its own magnetic field and aurorae.",
    facts: [
      "Larger than the planet Mercury",
      "Only moon with its own magnetosphere",
      "May contain more water than Earth",
      "Part of a 1:2:4 orbital resonance with Europa and Io",
    ],
    distLabel: "1,070,412 km from Jupiter", dayLabel: "7.15 Earth days", yearLabel: "7.15 days",
  },
  {
    id: "callisto", name: "Callisto", type: "moon", parent: "jupiter", orbitKm: 1882709, radiusKm: 2410.3,
    massLabel: "1.08 × 10²³ kg", gravityLabel: "1.24 m/s²", a: 0.01259, e: 0.0074, periodDays: 16.69,
    rotationHours: 400.5, tiltDeg: 0, inclinationDeg: 0.28, L0: 180, tempLabel: "−139 °C average",
    moonCount: 0, atmosphere: "Trace CO₂ & O₂", surface: "The most heavily cratered body known",
    color: "#7d746b",
    description: "An ancient, ice-cratered archive of the early Solar System. Its surface has barely changed for 4 billion years.",
    facts: [
      "Most cratered object in the Solar System",
      "Named after a nymph of Artemis in myth",
      "Valhalla basin rings span 3,000 km",
      "A possible base for future human exploration of Jupiter's system",
    ],
    distLabel: "1,882,709 km from Jupiter", dayLabel: "16.7 Earth days", yearLabel: "16.7 days",
  },
  {
    id: "titan", name: "Titan", type: "moon", parent: "saturn", orbitKm: 1221870, radiusKm: 2574.7,
    massLabel: "1.35 × 10²³ kg", gravityLabel: "1.35 m/s²", a: 0.00817, e: 0.0288, periodDays: 15.95,
    rotationHours: 382.7, tiltDeg: 0, inclinationDeg: 0.33, L0: 120, tempLabel: "−179 °C",
    moonCount: 0, atmosphere: "98 % N₂, methane — 1.5 bar at surface", surface: "Methane rivers, dunes, hydrocarbon seas",
    color: "#d9a45c",
    description: "The only moon with a dense atmosphere — an orange organic haze hiding rivers and seas of liquid methane, in an eerie deep-frozen analog of Earth's water cycle.",
    facts: [
      "Only body besides Earth with stable surface liquids",
      "Huygens probe landed here in 2005 — the most distant landing ever",
      "Atmospheric pressure is 1.5 × Earth's",
      "Dragonfly rotorcraft will explore Titan in the 2030s",
    ],
    distLabel: "1,221,870 km from Saturn", dayLabel: "15.9 Earth days", yearLabel: "15.9 days",
  },
  {
    id: "enceladus", name: "Enceladus", type: "moon", parent: "saturn", orbitKm: 237948, radiusKm: 252.1,
    massLabel: "1.08 × 10²⁰ kg", gravityLabel: "0.11 m/s²", a: 0.00159, e: 0.0047, periodDays: 1.37,
    rotationHours: 32.9, tiltDeg: 0, inclinationDeg: 0.02, L0: 300, tempLabel: "−201 °C",
    moonCount: 0, atmosphere: "Water-vapor plumes", surface: "Brightest icy surface known, tiger-stripe fissures",
    color: "#eef3f7",
    description: "A tiny icy moon with a secret ocean. Geyser plumes blast salty water hundreds of kilometres into space from 'tiger stripe' fissures at its south pole.",
    facts: [
      "Reflects nearly 100 % of sunlight — the Solar System's brightest world",
      "Plumes feed Saturn's E ring",
      "Contains organic molecules and hydrothermal hints",
      "Global ocean sits beneath just ~20–30 km of ice",
    ],
    distLabel: "237,948 km from Saturn", dayLabel: "1.37 Earth days", yearLabel: "1.37 days",
  },
  {
    id: "triton", name: "Triton", type: "moon", parent: "neptune", orbitKm: 354759, radiusKm: 1353.4,
    massLabel: "2.14 × 10²² kg", gravityLabel: "0.78 m/s²", a: 0.00237, e: 0.00002, periodDays: -5.88,
    rotationHours: -141.0, tiltDeg: 0, inclinationDeg: 157, L0: 60, tempLabel: "−235 °C",
    moonCount: 0, atmosphere: "Thin nitrogen, ~1/70,000 bar", surface: "Frozen nitrogen geysers, cantaloupe terrain",
    color: "#b8c7d9",
    description: "Neptune's captured Kuiper Belt moon, orbiting backwards. Nitrogen geysers erupt through its frozen surface — the coldest volcanic activity known.",
    facts: [
      "Orbits Neptune retrograde — almost certainly captured",
      "Nitrogen geysers erupt up to 8 km high",
      "One of the coldest worlds known: −235 °C",
      "Will eventually be torn apart into a ring",
    ],
    distLabel: "354,759 km from Neptune", dayLabel: "5.9 Earth days (retro)", yearLabel: "5.9 days",
  },
  /* ------------------------------- COMETS ------------------------------ */
  {
    id: "halley", name: "1P/Halley", type: "comet", radiusKm: 5.5, massLabel: "2.2 × 10¹⁴ kg",
    gravityLabel: "~0.0004 m/s²", a: 17.83, e: 0.967, periodDays: 27510, rotationHours: 52.8,
    tiltDeg: 0, inclinationDeg: 162.3, L0: 230, tempLabel: "Sublimates near Sun",
    moonCount: 0, atmosphere: "Coma of gas & dust when near Sun", surface: "Dark peanut-shaped nucleus, 15 × 8 km",
    color: "#9fd8ff",
    description: "The most famous comet — recorded for over 2,200 years. It returns to the inner Solar System every 75–79 years; next perihelion is mid-2061.",
    facts: [
      "Next perihelion: July 2061",
      "Orbits the Sun backwards (retrograde)",
      "Parent of the Orionid & Eta Aquariid meteor showers",
      "Vega & Giotto spacecraft flew past in 1986",
    ],
    distLabel: "0.59 – 35.1 AU range", dayLabel: "2.2 Earth days", yearLabel: "75–79 Earth years",
  },
  {
    id: "halebopp", name: "C/1995 O1 Hale-Bopp", type: "comet", radiusKm: 30, massLabel: "~10¹³ kg (est.)",
    gravityLabel: "~0.001 m/s²", a: 186, e: 0.995, periodDays: 912500, rotationHours: 11.3,
    tiltDeg: 0, inclinationDeg: 89.4, L0: 130, tempLabel: "Sublimates near Sun",
    moonCount: 0, atmosphere: "Huge dust + ion coma", surface: "Nucleus ~60 km wide",
    color: "#ffe9b0",
    description: "The Great Comet of 1997, visible to the naked eye for 18 months — one of the most observed comets in history. It won't return for over 2,000 years.",
    facts: [
      "Visible to the naked eye for a record 18 months",
      "Perihelion was April 1997",
      "Discovered independently by Alan Hale and Thomas Bopp",
      "Has a second, faint sodium tail",
    ],
    distLabel: "0.9 – 370 AU range", dayLabel: "11.3 hours", yearLabel: "~2,500 Earth years",
  },
  /* ----------------------------- SPACECRAFT ---------------------------- */
  {
    id: "voyager1", name: "Voyager 1", type: "spacecraft", radiusKm: 0.002, massLabel: "825 kg",
    gravityLabel: "n/a", a: 0, e: 0, periodDays: 0, rotationHours: 0, tiltDeg: 0,
    inclinationDeg: 35, L0: 0, tempLabel: "n/a", moonCount: 0,
    atmosphere: "n/a", surface: "3.7 m high-gain antenna · golden record",
    color: "#8de8a0",
    description: "Launched 1977. After flybys of Jupiter and Saturn, Voyager 1 became the first human-made object to enter interstellar space (2012). It remains the most distant human object — over 24 billion km away.",
    facts: [
      "Farthest human-made object — ~165 AU and climbing",
      "Carries the Golden Record of Earth's sounds",
      "Its 'Pale Blue Dot' photo reframed our place in space",
      "Still whispering data home at 160 bits per second",
    ],
    distLabel: "~24.6B km (2026)", dayLabel: "n/a", yearLabel: "Launched 1977",
  },
  {
    id: "voyager2", name: "Voyager 2", type: "spacecraft", radiusKm: 0.002, massLabel: "825 kg",
    gravityLabel: "n/a", a: 0, e: 0, periodDays: 0, rotationHours: 0, tiltDeg: 0,
    inclinationDeg: -48, L0: 0, tempLabel: "n/a", moonCount: 0,
    atmosphere: "n/a", surface: "The only craft to visit Uranus & Neptune",
    color: "#8de8a0",
    description: "Launched 1977. The only spacecraft to have visited Uranus and Neptune. Entered interstellar space in 2018 and continues sending data from beyond the heliosphere.",
    facts: [
      "Only visitor to Uranus and Neptune — ever",
      "Entered interstellar space Nov 2018",
      "Discovered 11 new moons during its grand tour",
      "Twin to Voyager 1, on a different trajectory",
    ],
    distLabel: "~20.5B km (2026)", dayLabel: "n/a", yearLabel: "Launched 1977",
  },
  {
    id: "newhorizons", name: "New Horizons", type: "spacecraft", radiusKm: 0.002, massLabel: "478 kg",
    gravityLabel: "n/a", a: 0, e: 0, periodDays: 0, rotationHours: 0, tiltDeg: 0,
    inclinationDeg: 2.5, L0: 0, tempLabel: "n/a", moonCount: 0,
    atmosphere: "n/a", surface: "Pluto flyby craft · LORRI telescope",
    color: "#8de8a0",
    description: "Launched 2006. Delivered humanity's first close-up of Pluto in 2015 and later flew past Kuiper Belt object Arrokoth. Now cruising the distant Kuiper Belt.",
    facts: [
      "Revealed Pluto's heart-shaped glacier in 2015",
      "Fastest launch ever from Earth — 58,500 km/h",
      "Flew past Arrokoth, 6.6B km from the Sun, in 2019",
      "Carries some of Clyde Tombaugh's ashes",
    ],
    distLabel: "~63 AU (2026)", dayLabel: "n/a", yearLabel: "Launched 2006",
  },
  {
    id: "cassini", name: "Cassini–Huygens", type: "spacecraft", radiusKm: 0.002, massLabel: "5,712 kg",
    gravityLabel: "n/a", a: 0, e: 0, periodDays: 0, rotationHours: 0, tiltDeg: 0,
    inclinationDeg: 0, L0: 0, tempLabel: "n/a", moonCount: 0,
    atmosphere: "n/a", surface: "Orbited Saturn 2004–2017 (mission ended)",
    color: "#e8b06a",
    description: "Orbited Saturn for 13 years, revealing ring structure, ocean worlds and Titan's methane seas. Deliberately plunged into Saturn's atmosphere in 2017. Shown here on an illustrative commemorative orbit.",
    facts: [
      "Discovered geysers on Enceladus",
      "Dropped Huygens onto Titan — farthest landing ever",
      "Flew through Saturn's rings 22 times at mission's end",
      "Ended Sept 15, 2017 in Saturn's atmosphere",
    ],
    distLabel: "At Saturn (1.43B km)", dayLabel: "n/a", yearLabel: "1997 – 2017",
  },
  {
    id: "juno", name: "Juno", type: "spacecraft", radiusKm: 0.002, massLabel: "3,625 kg",
    gravityLabel: "n/a", a: 0, e: 0, periodDays: 0, rotationHours: 0, tiltDeg: 0,
    inclinationDeg: 0, L0: 0, tempLabel: "n/a", moonCount: 0,
    atmosphere: "n/a", surface: "Polar orbiter of Jupiter since 2016",
    color: "#8de8a0",
    description: "Arrived at Jupiter in 2016. Juno peers beneath the cloud tops with microwave radiometers, mapping Jupiter's gravity, magnetic field and deep winds while its solar panels soak up 1/25th of Earth's sunlight.",
    facts: [
      "Most distant solar-powered spacecraft",
      "Its microwave eyes see 500 km below the clouds",
      "Found Jupiter's cyclones arranged in polygons",
      "Extended mission now studies Jupiter's moons too",
    ],
    distLabel: "At Jupiter (778M km)", dayLabel: "n/a", yearLabel: "Launched 2011",
  },
  {
    id: "parker", name: "Parker Solar Probe", type: "spacecraft", radiusKm: 0.002, massLabel: "685 kg",
    gravityLabel: "n/a", a: 0.55, e: 0.75, periodDays: 149.0, rotationHours: 0, tiltDeg: 0,
    inclinationDeg: 3.4, L0: 10, tempLabel: "Heat shield faces 1,370 °C", moonCount: 0,
    atmosphere: "n/a", surface: "11.4 cm carbon heat shield",
    color: "#ffd166",
    description: "Launched 2018. The fastest human-made object ever, diving repeatedly through the Sun's corona — closer than 6.9 million km — to unravel how the corona is heated and solar wind launched.",
    facts: [
      "Fastest object ever: ~692,000 km/h at perihelion",
      "Closest approach: 6.9M km from the Sun's surface",
      "Its shield keeps instruments near room temperature",
      "Named after astrophysicist Eugene Parker while he lived",
    ],
    distLabel: "0.046 – 0.73 AU", dayLabel: "n/a", yearLabel: "Launched 2018",
  },
];

export const BODY_BY_ID: Record<string, CelestialBody> = Object.fromEntries(
  BODIES.map((b) => [b.id, b])
);

export const PLANETS = BODIES.filter((b) => b.type === "planet" || b.type === "star" || b.type === "dwarf");
export const MOONS = BODIES.filter((b) => b.type === "moon");
export const COMETS = BODIES.filter((b) => b.type === "comet");
export const SPACECRAFT = BODIES.filter((b) => b.type === "spacecraft");
export const moonsOf = (parentId: string) => MOONS.filter((m) => m.parent === parentId);

/* ------------------------------- missions ------------------------------ */

export interface Mission {
  id: string;
  title: string;
  objective: string;
  reward: string;
}

export const MISSIONS: Mission[] = [
  { id: "m1", title: "Mission 01 · Homecoming", objective: "Locate and select Earth", reward: "Pale Blue Dot badge" },
  { id: "m2", title: "Mission 02 · Giant's Companion", objective: "Find Jupiter's largest moon, Ganymede", reward: "Galilean Navigator" },
  { id: "m3", title: "Mission 03 · Lord of the Rings", objective: "Find and inspect Saturn", reward: "Ring Shepherd" },
  { id: "m4", title: "Mission 04 · Rubble Field", objective: "Identify the asteroid belt (select Ceres)", reward: "Belt Surveyor" },
  { id: "m5", title: "Mission 05 · The Crossing", objective: "Plan a journey from Earth to Mars", reward: "Transfer Window" },
  { id: "m6", title: "Mission 06 · Blood Moon", objective: "Observe a lunar eclipse", reward: "Umbra Witness" },
  { id: "m7", title: "Mission 07 · Twin Study", objective: "Compare Earth and Mars", reward: "Comparative Planetologist" },
  { id: "m8", title: "Mission 08 · Interstellar", objective: "Find Voyager 1 beyond Neptune", reward: "Golden Record Keeper" },
];

/* ------------------------------ learn topics --------------------------- */

export interface LearnTopic {
  id: string;
  q: string;
  a: string;
  action?: { label: string; type: "focus" | "compare" | "eclipse" | "travel"; payload: string | string[] };
}

export const LEARN_TOPICS: LearnTopic[] = [
  {
    id: "jupiter-size", q: "Why is Jupiter so large?",
    a: "Jupiter formed early, just beyond the frost line, where ice could survive — giving it far more solid material to accrete. Once its core reached ~10 Earth masses it began runaway gas capture from the nebula, ballooning to 318 Earth masses before the young Sun's wind blew the gas away.",
    action: { label: "Visit Jupiter", type: "focus", payload: "jupiter" },
  },
  {
    id: "saturn-rings", q: "Why does Saturn have rings?",
    a: "The rings are billions of ice fragments — from dust grains to house-sized boulders — orbiting inside Saturn's Roche limit, where tidal gravity prevents them from clumping into a moon. They may be the shredded remains of a moon, a comet, or pristine material from Saturn's formation.",
    action: { label: "View Saturn's rings", type: "focus", payload: "saturn" },
  },
  {
    id: "venus-heat", q: "Why is Venus hotter than Mercury?",
    a: "Mercury is closer to the Sun, but it has no atmosphere to trap heat. Venus is wrapped in 92 bars of CO₂ beneath sulfuric-acid clouds — a runaway greenhouse that holds 464 °C at the surface, day and night, pole to equator.",
    action: { label: "Visit Venus", type: "focus", payload: "venus" },
  },
  {
    id: "seasons", q: "Why does Earth have seasons?",
    a: "Earth's axis is tilted 23.4° relative to its orbit. As Earth circles the Sun, each hemisphere leans toward or away from the sunlight — changing the angle and hours of sunlight, not the distance. That's why it's summer in Australia when it's winter in Europe.",
    action: { label: "Inspect Earth's tilt", type: "focus", payload: "earth" },
  },
  {
    id: "eclipse", q: "How does an eclipse happen?",
    a: "When Sun, Earth and Moon align in a straight line (syzygy). If the Moon passes between Sun and Earth, its shadow paints a solar eclipse; if Earth comes between Sun and Moon, Earth's umbra darkens the Moon into a coppery-red lunar eclipse.",
    action: { label: "Open eclipse lab", type: "eclipse", payload: "lunar" },
  },
  {
    id: "tides", q: "What causes tides?",
    a: "The Moon's gravity pulls harder on the near side of Earth than the far side, stretching the oceans into two bulges. As Earth rotates beneath them, coastlines pass through two high and two low tides each day. The Sun adds spring and neap variations.",
    action: { label: "See Earth & Moon", type: "focus", payload: "moon" },
  },
  {
    id: "lightyear", q: "What is a light-year?",
    a: "The distance light travels in one Julian year: 9.46 trillion km. The Sun is 8.3 light-minutes away; Neptune ~4.1 light-hours; the nearest star, Proxima Centauri, 4.24 light-years. Astronomers use it because space is too vast for kilometres.",
    action: { label: "Fly to Neptune", type: "focus", payload: "neptune" },
  },
  {
    id: "transfer", q: "How do we travel to Mars?",
    a: "Ships follow a Hohmann transfer ellipse: burn to leave Earth's orbit, coast half an ellipse tangent to Mars' orbit, arrive ~8–9 months later when Mars meets them there. Launch windows open every 26 months when the planets align for the transfer.",
    action: { label: "Plan Earth → Mars", type: "travel", payload: ["earth", "mars"] },
  },
];
