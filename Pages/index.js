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
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      try {
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
        setErrorMsg('Netzwerkfehler – bitte erneut versuchen.')
        setStatus('error')
      }
    }
    reader.readAsDataURL(file)
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
