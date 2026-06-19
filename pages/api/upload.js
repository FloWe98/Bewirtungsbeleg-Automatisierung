export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fileData, fileName, fileType, anlass, teilnehmer } = req.body

    if (!fileData || !fileName || !anlass) {
      return res.status(400).json({ error: 'Fehlende Pflichtfelder' })
    }

    const webhookRes = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData,
        fileName,
        fileType,
        anlass,
        teilnehmer,
        uploadedAt: new Date().toISOString(),
      }),
    })

    if (!webhookRes.ok) {
      return res.status(502).json({ error: 'Webhook Fehler' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
