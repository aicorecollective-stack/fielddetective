export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.json({ status: '❌ ANTHROPIC_API_KEY missing' })

  // Quick test call - text only, no image
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Say: OK' }],
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.json({ status: '❌ API Error', code: r.status, detail: data })
    return res.json({ status: '✅ AI Working', response: data.content?.[0]?.text })
  } catch(e) {
    return res.json({ status: '❌ Network Error', error: e.message })
  }
}
