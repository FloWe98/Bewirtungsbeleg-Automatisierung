# Bewirtungsbeleg App

Web-App zum Einreichen von Bewirtungsbelegen. Beleg hochladen, Anlass einsprechen → Make-Webhook wird automatisch getriggert.

## Setup

### 1. GitHub Repository
Repository erstellen und diesen Code hochladen.

### 2. Vercel
1. [vercel.com](https://vercel.com) → „New Project" → GitHub Repo importieren
2. Framework: **Next.js** (wird automatisch erkannt)
3. Unter **Settings > Environment Variables** eintragen:

| Variable | Wert |
|---|---|
| `MAKE_WEBHOOK_URL` | Dein Make Webhook URL |
| `ANTHROPIC_API_KEY` | Dein Claude API Key |

4. Deployen

### 3. Make Szenario
Der Webhook empfängt folgende Felder:

```json
{
  "fileData": "<base64-kodierte Datei>",
  "fileName": "beleg.jpg",
  "fileType": "image/jpeg",
  "anlass": "Kundengespräch mit Max Mustermann",
  "teilnehmer": "Max Mustermann, Anna Schmidt",
  "uploadedAt": "2024-01-15T14:30:00.000Z"
}
```

Im Make Szenario:
- **Webhook** → empfängt die Daten
- **Claude API** → extrahiert Datum, Betrag, Restaurant aus `fileData` (base64 Bild/PDF)
- **Google Drive** → legt Datei ab unter `Jahr/Monat/Bewirtungsbelege/`

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local
# .env.local mit echten Werten befüllen
npm run dev
```

## Dateiformat

Erlaubte Uploads: JPG, PNG, WebP, PDF (max. 10 MB)
