export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.json({ error: 'No API key' })

  // Test text-only call
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Identify this: old bronze coin. Reply with Name: Roman coin, Rarity: 3, Ancient: yes' }],
      }),
    })
    const d = await r.json()
    return res.json({ ok: r.ok, status: r.status, text: d.content?.[0]?.text, err: d.error })
  } catch(e) {
    return res.json({ error: e.message })
  }
}
