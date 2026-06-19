import { useState, useRef, useCallback } from 'react'
import Head from 'next/head'

export default function Home() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [anlass, setAnlass] = useState('')
  const [teilnehmer, setTeilnehmer] = useState('')
  const [isRecordingAnlass, setIsRecordingAnlass] = useState(false)
  const [isRecordingTeilnehmer, setIsRecordingTeilnehmer] = useState(false)
  const [status, setStatus] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef(null)
  const anlassRecognitionRef = useRef(null)
  const teilnehmerRecognitionRef = useRef(null)

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(selectedFile.type)) {
      setErrorMsg('Nur JPG, PNG, WebP oder PDF erlaubt.')
      setStatus('error')
      return
    }
    setFile(selectedFile)
    setStatus(null)
    setErrorMsg('')
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview('pdf')
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [])

  const startVoice = (field) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Spracheingabe wird von diesem Browser nicht unterstützt. Bitte Chrome verwenden.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'de-DE'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      if (field === 'anlass') {
        setAnlass(prev => prev ? prev + ' ' + transcript : transcript)
        setIsRecordingAnlass(false)
      } else {
        setTeilnehmer(prev => prev ? prev + ' ' + transcript : transcript)
        setIsRecordingTeilnehmer(false)
      }
    }
    recognition.onerror = () => {
      setIsRecordingAnlass(false)
      setIsRecordingTeilnehmer(false)
    }
    recognition.onend = () => {
      setIsRecordingAnlass(false)
      setIsRecordingTeilnehmer(false)
    }
    if (field === 'anlass') {
      anlassRecognitionRef.current = recognition
      setIsRecordingAnlass(true)
    } else {
      teilnehmerRecognitionRef.current = recognition
      setIsRecordingTeilnehmer(true)
    }
    recognition.start()
  }

  const stopVoice = (field) => {
    if (field === 'anlass' && anlassRecognitionRef.current) {
      anlassRecognitionRef.current.stop()
      setIsRecordingAnlass(false)
    } else if (field === 'teilnehmer' && teilnehmerRecognitionRef.current) {
      teilnehmerRecognitionRef.current.stop()
      setIsRecordingTeilnehmer(false)
    }
  }

  const handleSubmit = async () => {
    if (!file) { setErrorMsg('Bitte einen Beleg hochladen.'); setStatus('error'); return }
    if (!anlass.trim()) { setErrorMsg('Bitte einen Anlass angeben.'); setStatus('error'); return }

    setStatus('loading')
    setErrorMsg('')

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64,
          fileName: file.name,
          fileType: file.type,
          anlass: anlass.trim(),
          teilnehmer: teilnehmer.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setTimeout(() => {
          setFile(null)
          setPreview(null)
          setAnlass('')
          setTeilnehmer('')
          setStatus(null)
        }, 3000)
      } else {
        setErrorMsg(data.error || 'Unbekannter Fehler')
        setStatus('error')
      }
    } catch (err) {
      setErrorMsg('Fehler: ' + err.message)
      setStatus('error')
    }
  }

  return (
    <>
      <Head>
        <title>Bewirtungsbeleg einreichen</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Fraunces:ital,wght@0,300;1,300&display=swap" rel="stylesheet" />
      </Head>

      <div className="shell">
        <header>
          <p className="eyebrow">Buchhaltung</p>
          <h1>Bewirtungsbeleg<br /><em>einreichen</em></h1>
          <p className="subtitle">Beleg hochladen, Anlass einsprechen – fertig.</p>
        </header>

        <main>
          <section className="card">
            <label className="card-label">Beleg</label>
            <div
              className={`dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              {!file ? (
                <div className="dropzone-empty">
                  <span className="drop-icon">↑</span>
                  <p>Foto oder PDF ablegen</p>
                  <span className="drop-hint">oder tippen zum Auswählen</span>
                </div>
              ) : preview === 'pdf' ? (
                <div className="pdf-preview">
                  <span className="pdf-icon">PDF</span>
                  <p>{file.name}</p>
                  <button className="remove-btn" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}>Entfernen</button>
                </div>
              ) : (
                <div className="img-preview-wrap">
                  <img src={preview} alt="Beleg Vorschau" className="img-preview" />
                  <button className="remove-btn" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}>Entfernen</button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden-input"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </section>

          <section className="card">
            <label className="card-label">Geschäftlicher Anlass <span className="required">*</span></label>
            <div className="voice-row">
              <textarea
                className="textarea"
                placeholder="z.B. Kundengespräch mit Max Mustermann, Projektbesprechung…"
                value={anlass}
                onChange={(e) => setAnlass(e.target.value)}
                rows={3}
              />
              <button
                className={`mic-btn ${isRecordingAnlass ? 'recording' : ''}`}
                onMouseDown={() => startVoice('anlass')}
                onMouseUp={() => stopVoice('anlass')}
                onTouchStart={(e) => { e.preventDefault(); startVoice('anlass') }}
                onTouchEnd={() => stopVoice('anlass')}
                title={isRecordingAnlass ? 'Aufnahme läuft…' : 'Halten zum Sprechen'}
              >
                {isRecordingAnlass ? '⏺' : '🎙'}
              </button>
            </div>
            {isRecordingAnlass && <p className="recording-hint">Aufnahme läuft – loslassen zum Beenden</p>}
          </section>

          <section className="card">
            <label className="card-label">Teilnehmer</label>
            <div className="voice-row">
              <textarea
                className="textarea"
                placeholder="z.B. Max Mustermann (Firma XY), Anna Schmidt…"
                value={teilnehmer}
                onChange={(e) => setTeilnehmer(e.target.value)}
                rows={2}
              />
              <button
                className={`mic-btn ${isRecordingTeilnehmer ? 'recording' : ''}`}
                onMouseDown={() => startVoice('teilnehmer')}
                onMouseUp={() => stopVoice('teilnehmer')}
                onTouchStart={(e) => { e.preventDefault(); startVoice('teilnehmer') }}
                onTouchEnd={() => stopVoice('teilnehmer')}
                title={isRecordingTeilnehmer ? 'Aufnahme läuft…' : 'Halten zum Sprechen'}
              >
                {isRecordingTeilnehmer ? '⏺' : '🎙'}
              </button>
            </div>
            {isRecordingTeilnehmer && <p className="recording-hint">Aufnahme läuft – loslassen zum Beenden</p>}
          </section>

          {status === 'error' && (
            <div className="alert alert-error">{errorMsg}</div>
          )}
          {status === 'success' && (
            <div className="alert alert-success">
              ✓ Beleg erfolgreich übermittelt – wird jetzt automatisch abgelegt.
            </div>
          )}

          <button
            className={`submit-btn ${status === 'loading' ? 'loading' : ''} ${status === 'success' ? 'done' : ''}`}
            onClick={handleSubmit}
            disabled={status === 'loading' || status === 'success'}
          >
            {status === 'loading' ? 'Wird übermittelt…' : status === 'success' ? '✓ Erledigt' : 'Beleg einreichen →'}
          </button>
        </main>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-size: 16px; }
        body {
          font-family: 'Inter', sans-serif;
          background: #F0EDE8;
          color: #1A1714;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .shell { max-width: 540px; margin: 0 auto; padding: 48px 24px 80px; }
        header { margin-bottom: 40px; }
        .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8B7355; margin-bottom: 12px; }
        h1 { font-family: 'Fraunces', serif; font-weight: 300; font-size: 2.6rem; line-height: 1.1; color: #1A1714; margin-bottom: 12px; }
        h1 em { font-style: italic; color: #8B7355; }
        .subtitle { font-size: 0.95rem; color: #5C5248; line-height: 1.5; }
        main { display: flex; flex-direction: column; gap: 16px; }
        .card { background: #FFFFFF; border-radius: 12px; padding: 20px; border: 1px solid #E4DDD5; }
        .card-label { display: block; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #8B7355; margin-bottom: 12px; }
        .required { color: #C0392B; }
        .dropzone { border: 2px dashed #D4C9BC; border-radius: 8px; padding: 32px 20px; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; background: #FAF8F5; }
        .dropzone:hover, .dropzone.dragging { border-color: #8B7355; background: #F5F0EA; }
        .dropzone.has-file { cursor: default; border-style: solid; border-color: #8B7355; }
        .dropzone-empty p { font-size: 0.95rem; color: #5C5248; margin: 8px 0 4px; }
        .drop-icon { font-size: 1.8rem; color: #8B7355; }
        .drop-hint { font-size: 0.78rem; color: #A09080; }
        .pdf-preview { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .pdf-icon { display: inline-block; background: #8B7355; color: white; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; padding: 4px 8px; border-radius: 4px; }
        .pdf-preview p { font-size: 0.85rem; color: #5C5248; word-break: break-all; }
        .img-preview-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .img-preview { max-height: 200px; max-width: 100%; border-radius: 6px; object-fit: contain; }
        .remove-btn { font-size: 0.78rem; color: #C0392B; background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0; }
        .hidden-input { display: none; }
        .voice-row { display: flex; gap: 10px; align-items: flex-start; }
        .textarea { flex: 1; border: 1px solid #D4C9BC; border-radius: 8px; padding: 10px 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #1A1714; background: #FAF8F5; resize: none; transition: border-color 0.15s; line-height: 1.5; }
        .textarea:focus { outline: none; border-color: #8B7355; }
        .textarea::placeholder { color: #B0A090; }
        .mic-btn { flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%; border: 2px solid #D4C9BC; background: #FAF8F5; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; user-select: none; touch-action: none; }
        .mic-btn:hover { border-color: #8B7355; }
        .mic-btn.recording { border-color: #C0392B; background: #FDF0EE; animation: pulse 1s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .recording-hint { font-size: 0.75rem; color: #C0392B; margin-top: 6px; }
        .alert { padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; line-height: 1.4; }
        .alert-error { background: #FDF0EE; color: #C0392B; border: 1px solid #F5C6BC; }
        .alert-success { background: #EEF7F0; color: #1E7E34; border: 1px solid #B8DFBF; }
        .submit-btn { width: 100%; padding: 16px; background: #1A1714; color: #F0EDE8; border: none; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 8px; letter-spacing: 0.02em; }
        .submit-btn:hover:not(:disabled) { background: #2D2925; }
        .submit-btn.loading { background: #5C5248; cursor: default; }
        .submit-btn.done { background: #1E7E34; cursor: default; }
        .submit-btn:disabled { opacity: 0.85; }
        @media (max-width: 480px) { .shell { padding: 32px 16px 60px; } h1 { font-size: 2rem; } }
      `}</style>
    </>
  )
}
