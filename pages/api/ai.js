export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',  // images can be large
    },
  },
}

export default async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' })

  const { prompt, imageBase64 } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  const messages = imageBase64
    ? [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: prompt }
      ]}]
    : [{ role: 'user', content: prompt }]

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages }),
    })

    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'API error' })
    return res.json({ text: data.content?.[0]?.text || '' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
