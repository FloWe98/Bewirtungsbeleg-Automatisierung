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

  const webhookUrl = process.env.MAKE_WEBHOOK_URL
  if (!webhookUrl) {
    return res.status(500).json({ error: 'MAKE_WEBHOOK_URL nicht konfiguriert' })
  }

  try {
    const { fileData, fileName, fileType, anlass, teilnehmer } = req.body

    if (!fileData || !fileName || !anlass) {
      return res.status(400).json({ error: 'Fehlende Pflichtfelder' })
    }

    // Forward to Make webhook
    const makeResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData,        // base64-encoded file
        fileName,        // original filename
        fileType,        // MIME type
        anlass,          // business purpose (from voice/text input)
        teilnehmer,      // participants
        uploadedAt: new Date().toISOString(),
      }),
    })

    if (!makeResponse.ok) {
      const errorText = await makeResponse.text()
      console.error('Make webhook error:', errorText)
      return res.status(502).json({ error: 'Make Webhook Fehler', details: errorText })
    }

    return res.status(200).json({ success: true, message: 'Beleg erfolgreich übermittelt' })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ error: 'Interner Fehler', details: error.message })
  }
}
