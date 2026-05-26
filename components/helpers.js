export const getR = (s) => {
  const RARITY = [
    { score:1, color:"#6b7280", emoji:"⚫" },
    { score:2, color:"#22c55e", emoji:"🟢" },
    { score:3, color:"#3b82f6", emoji:"🔵" },
    { score:4, color:"#a855f7", emoji:"🟣" },
    { score:5, color:"#f59e0b", emoji:"🟡" },
  ];
  return RARITY.find(r => r.score === s) || RARITY[0];
};

export const ANCIENT_KW = ["roman","byzantine","ottoman","ancient","classical","hellenistic","mycenaean","minoan","neolithic","bronze age","iron age","archaic","prehistoric","medieval","archaeological","bc ","b.c","century","antique","historic","relic","artifact"];

export const isAnc = (f) =>
  ANCIENT_KW.some(k => `${f.name} ${f.aiResult||""} ${f.notes||""}`.toLowerCase().includes(k)) && f.rarity >= 3;

export const fmtTime = (s) =>
  `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

export const haverD = (a, b) => {
  const R=6371000, dLa=(b.lat-a.lat)*Math.PI/180, dLn=(b.lng-a.lng)*Math.PI/180;
  const x=Math.sin(dLa/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLn/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
};

export const callAI = async (prompt, img=null) => {
  const msgs = img
    ? [{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:img}},{type:"text",text:prompt}]}]
    : [{role:"user",content:prompt}];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:msgs })
  });
  return (await r.json()).content?.[0]?.text || "";
};

export const exportGPX = (session, finds, route=[]) => {
  const sf = finds.filter(f => f.sessionId === session.id);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FieldDetective" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${session.name}</name><time>${session.date}T00:00:00Z</time></metadata>
  ${sf.map(f=>`<wpt lat="${f.lat}" lon="${f.lng}"><name>${f.name}</name><desc>${f.category} | ${f.depth}cm | Rarity:${f.rarity}/5</desc></wpt>`).join("\n  ")}
  <trk><name>${session.name}</name><trkseg>
    ${route.map(p=>`<trkpt lat="${p.lat}" lon="${p.lng}"/>`).join("\n    ")}
  </trkseg></trk>
</gpx>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([xml], {type:"application/gpx+xml"}));
  a.download = `fielddetective-${session.name.replace(/\s+/g,"-")}-${session.date}.gpx`;
  a.click();
};
