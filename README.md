# 🕵️ FieldDetective

Metal detecting companion app with AI identification, GPS tracking, and historical maps.

## Features
- 🗺️ 6 map layers: Street, Satellite, Topo, Historical, Mapire 1800s, Ktimanet Aerial '60s
- 🤖 AI find identification (Anthropic Claude)
- 📍 GPS session recording with route tracking
- ⚠️ Ancient find detection + legal alerts (Greek law 3028/2002)
- 📤 GPX export
- 🌍 Bilingual: Greek / English
- 🔒 GDPR compliant
- 📱 PWA — installs as app on mobile

## Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variable: `NEXT_PUBLIC_ANTHROPIC_API_KEY=your_key`
4. Deploy!

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000
