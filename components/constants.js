// ─── MAP LAYERS ───────────────────────────────────────────────────────────────
export const MAP_LAYERS = [
  {
    k: "street",
    emoji: "🗺️",
    label: { el: "Οδικός", en: "Street" },
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
    subdomains: "abc",
  },
  {
    k: "satellite",
    emoji: "🛰️",
    label: { el: "Δορυφόρος", en: "Satellite" },
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri World Imagery",
    maxZoom: 18,
  },
  {
    k: "topo",
    emoji: "🏔️",
    label: { el: "Τοπογρ.", en: "Topo" },
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri World Topo",
    maxZoom: 18,
  },
  {
    k: "historical",
    emoji: "📜",
    label: { el: "Χάρτης 18ου", en: "18th Century" },
    url: "/api/tiles?provider=mapire18&z={z}&x={x}&y={y}",
    attribution: "© Mapire | Arcanum — 18th century",
    maxZoom: 15,
  },
  {
    k: "mapire",
    emoji: "🏛️",
    label: { el: "Χάρτης 19ου", en: "19th Century" },
    url: "/api/tiles?provider=mapire19&z={z}&x={x}&y={y}",
    attribution: "© Mapire | Arcanum — 19th century",
    maxZoom: 15,
  },
  {
    k: "ktimanet",
    emoji: "📸",
    label: { el: "Τοπογρ. Χάρτης", en: "Topo Detail" },
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri World Topo Map",
    maxZoom: 18,
  },
];

export const CATEGORIES = ["Coin","Ring","Button","Buckle","Artifact","Jewelry","Token","Military","Tool","Unknown"];

export const RARITY = [
  { score:1, color:"#6b7280", emoji:"⚫" },
  { score:2, color:"#22c55e", emoji:"🟢" },
  { score:3, color:"#3b82f6", emoji:"🔵" },
  { score:4, color:"#a855f7", emoji:"🟣" },
  { score:5, color:"#f59e0b", emoji:"🟡" },
];

export const ANCIENT_KW = ["roman","byzantine","ottoman","ancient","classical","hellenistic","mycenaean","minoan","neolithic","bronze age","iron age","archaic","prehistoric","medieval","archaeological","bc ","b.c","century","antique","historic","relic","artifact"];

export const MOCK_FINDS = [
  { id:1, name:"Roman Denarius",  category:"Coin",    depth:18, lat:37.9838, lng:23.7275, date:"2026-05-20", rarity:4, notes:"Silver, well preserved", sessionId:1, aiResult:"Roman silver denarius, circa 200 AD." },
  { id:2, name:"Bronze Ring",     category:"Ring",    depth:12, lat:37.9841, lng:23.7281, date:"2026-05-20", rarity:3, notes:"Byzantine origin",        sessionId:1, aiResult:"Byzantine bronze ring, 9th-12th century AD." },
  { id:3, name:"Military Button", category:"Military",depth:8,  lat:37.9835, lng:23.7270, date:"2026-05-15", rarity:2, notes:"19th century",            sessionId:2, aiResult:"19th century military button." },
  { id:4, name:"Silver Fibula",   category:"Jewelry", depth:25, lat:37.9848, lng:23.7260, date:"2026-04-28", rarity:5, notes:"Exceptional!",            sessionId:3, aiResult:"Silver fibula, Roman period. Rare." },
  { id:5, name:"Iron Buckle",     category:"Buckle",  depth:15, lat:37.9845, lng:23.7285, date:"2026-04-28", rarity:1, notes:"Common",                  sessionId:3, aiResult:"Medieval iron buckle." },
  { id:6, name:"Ottoman Coin",    category:"Coin",    depth:22, lat:37.9842, lng:23.7265, date:"2026-05-10", rarity:3, notes:"Copper",                  sessionId:2, aiResult:"Ottoman copper coin, 18th century." },
];

export const MOCK_SESSIONS = [
  { id:1, name:"Athens Excavation", date:"2026-05-20", duration:180, distance:2.4, finds:2, weather:"Sunny 24°C",  location:"Athens"   },
  { id:2, name:"Piraeus Coast",     date:"2026-05-15", duration:120, distance:1.8, finds:2, weather:"Cloudy 20°C", location:"Piraeus"  },
  { id:3, name:"Marathon Plains",   date:"2026-04-28", duration:240, distance:3.6, finds:2, weather:"Windy 18°C",  location:"Marathon" },
];
