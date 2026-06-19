export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { fileData, fileName, fileType, anlass, teilnehmer } = req.body

    // 1. Claude extrahiert die Belegdaten
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: fileType === 'application/pdf' ? 'document' : 'image',
                source: {
                  type: 'base64',
                  media_type: fileType,
                  data: fileData,
                },
              },
              {
                type: 'text',
                text: `Extrahiere aus diesem Bewirtungsbeleg folgende Felder und antworte NUR mit einem JSON-Objekt, ohne Erklärungen oder Markdown.

{
  "datum": "YYYY-MM-DD",
  "restaurant": "Name des Restaurants oder Lokals",
  "betrag_brutto": "Zahl mit 2 Dezimalstellen",
  "mwst_satz": "7 oder 19",
  "mwst": "Zahl mit 2 Dezimalstellen",
  "betrag_netto": "Zahl mit 2 Dezimalstellen",
  "anzahl_personen": "Anzahl als Zahl"
}

Anlass: ${anlass}
Teilnehmer: ${teilnehmer}

Falls ein Wert nicht lesbar ist, setze null.`,
              },
            ],
          },
        ],
      }),
    })

    const claudeData = await claudeRes.json()
    const raw = claudeData.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(raw)

    // 2. Fertige Daten an Make schicken
    await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...extracted,
        anlass,
        teilnehmer,
        fileName,
        fileType,
        fileData,
        kategorie: 'Bewirtungsbelege',
        uploadedAt: new Date().toISOString(),
      }),
    })

    res.status(200).json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
