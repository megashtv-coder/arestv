/**
 * Vercel Serverless Function — dërgon mesazh WhatsApp via Green API
 * Konfiguro këto env vars në Vercel dashboard:
 *   GREENAPI_INSTANCE_ID  →  instanceId nga green-api.com
 *   GREENAPI_TOKEN        →  apiToken  nga green-api.com
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { phone, message } = req.body || {}
  if (!phone || !message) return res.status(400).json({ error: 'phone dhe message janë të detyrueshme' })

  const instanceId = process.env.GREENAPI_INSTANCE_ID
  const apiToken   = process.env.GREENAPI_TOKEN

  if (!instanceId || !apiToken) {
    return res.status(503).json({ error: 'WhatsApp API nuk është konfiguruar në Vercel env vars' })
  }

  try {
    // Green API — formatim numri: hiq +, shtoni @c.us
    const chatId = phone.replace(/\D/g, '') + '@c.us'
    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message, quotedMessageId: '' }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      return res.status(resp.status).json({ error: 'Green API error', details: errText })
    }

    const data = await resp.json()
    return res.status(200).json({ ok: true, idMessage: data.idMessage })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
