export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { prompt, imageBase64 } = req.body
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment' })

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
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages,
      }),
    })

    if (!r.ok) {
      const err = await r.text()
      return res.status(r.status).json({ error: err })
    }

    const data = await r.json()
    return res.json({ text: data.content?.[0]?.text || '' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
