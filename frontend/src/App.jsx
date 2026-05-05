import { useMemo, useState } from 'react'
import './App.css'

const sampleMessages = [
  'Hey, shall we meet at the cafe at 6pm?',
  'Win a free iPhone by clicking here!!!',
  "Thanks for your feedback — I'll send the final version this afternoon.",
]

const API_URL = 'http://localhost:5000/predict'

function App() {
  const [message, setMessage] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const trimmedMessage = message.trim()
  const canSubmit = trimmedMessage.length > 0 && !loading

  const analysisHint = useMemo(() => {
    if (!trimmedMessage) return 'Paste a message to get an instant analysis.'
    if (trimmedMessage.length < 20) return 'Very short message: prediction may be less stable.'
    if (trimmedMessage.length > 280) return 'Long message detected: moderation watches for subtle signals.'
    return 'The model compares linguistic cues with a confidence score.'
  }, [trimmedMessage])

  const formatPercent = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—'
    return `${(value * 100).toFixed(1)}%`
  }

  const getSampleLabel = (sample) => {
    const label = sample.length > 28 ? `${sample.slice(0, 28).trimEnd()}…` : sample
    return label
  }

  const checkSpam = async () => {
    if (!trimmedMessage) return

    setLoading(true) // Active le mode chargement
    setResult(null)  // Efface l'ancien résultat

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || `Erreur serveur (${response.status})`)
      }

      setResult(data)
    } catch (error) {
      console.error("Erreur connexion backend:", error)
      setResult({ error: error?.message || "Impossible de contacter le serveur" })
    } finally {
      setLoading(false) // Désactive le mode chargement
    }
  }

  return (
    <div className="app-shell">
      <div className="app-shell__orb app-shell__orb--one" aria-hidden="true" />
      <div className="app-shell__orb app-shell__orb--two" aria-hidden="true" />

      <main className="dashboard">
        <section className="hero card">
          <div className="hero__copy">
            <p className="eyebrow">Smart anti-spam protection</p>
            <h1>Detect suspicious messages with a modern, clear interface.</h1>
            <p className="hero__subtitle">
              Instant analysis powered by FastText + MLP, built to inspect
              SMS, emails and promotional messages with a polished visual result.
            </p>

            <div className="hero__chips" aria-label="Points forts">
              <span className="chip">FastText</span>
              <span className="chip">MLP</span>
              <span className="chip">Confidence score</span>
            </div>
          </div>

          <div className="hero__stats">
            <div className="stat">
              <span className="stat__value">{trimmedMessage.length}</span>
              <span className="stat__label">characters entered</span>
            </div>
            <div className="stat">
              <span className="stat__value">{loading ? '...' : '1'}</span>
              <span className="stat__label">real-time analysis</span>
            </div>
          </div>
        </section>

        <section className="workspace">
          <article className="card composer">
            <div className="section-head">
              <div>
                <p className="eyebrow">Message to analyze</p>
                <h2>Paste text and run the check.</h2>
              </div>
              <span className="counter">{trimmedMessage.length}/500</span>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tapez ou collez un message ici..."
              rows="8"
              maxLength={500}
              disabled={loading}
            />

            <div className="composer__footer">
              <div className="sample-actions">
                {sampleMessages.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    className="sample-chip"
                    onClick={() => setMessage(sample)}
                    aria-label={`Use sample: ${sample}`}
                    disabled={loading}
                  >
                    {getSampleLabel(sample)}
                  </button>
                ))}
              </div>

              <button className="primary-btn" onClick={checkSpam} disabled={!canSubmit}>
                {loading ? 'Analyzing...' : 'Analyze message'}
              </button>
            </div>

            <p className="hint">{analysisHint}</p>
          </article>

          <aside className="card insights">
            <div className="section-head">
              <div>
                <p className="eyebrow">Result</p>
                <h2>Visual reading of the verdict.</h2>
              </div>
            </div>

            {!result && !loading && (
              <div className="empty-state">
                <div className="empty-state__icon">✨</div>
                <p>Your score will appear here after analysis.</p>
                <span>The panel shows status, confidence and probability breakdown.</span>
              </div>
            )}

            {loading && (
              <div className="loading-state" aria-live="polite">
                <div className="spinner" />
                <p>The model is analyzing the text…</p>
                <span>Preparing vector, scaling and final prediction.</span>
              </div>
            )}

            {result?.error && <p className="error">{result.error}</p>}

            {result && !result.error && (
              <div className={`result-panel ${result.prediction === 'spam' ? 'result-panel--spam' : 'result-panel--ham'}`}>
                <div className="result-panel__top">
                  <div>
                    <p className="result-panel__label">Model verdict</p>
                    <h3>{result.prediction === 'spam' ? 'Spam detected' : 'Legitimate message'}</h3>
                  </div>
                  <span className="result-badge">
                    {result.prediction === 'spam' ? 'Alert' : 'Safe'}
                  </span>
                </div>

                <div className="confidence-ring" aria-label={`Confidence ${formatPercent(result.confidence)}`}>
                  <div className="confidence-ring__value">{formatPercent(result.confidence)}</div>
                  <span className="confidence-ring__label">Confidence</span>
                </div>

                <div className="probability-list">
                  <div className="probability-item">
                    <div className="probability-item__row">
                      <span>Ham</span>
                      <strong>{formatPercent(result?.probabilities?.ham)}</strong>
                    </div>
                    <div className="meter">
                      <span style={{ width: `${Math.min(Math.max((result?.probabilities?.ham ?? 0) * 100, 0), 100)}%` }} />
                    </div>
                  </div>

                  <div className="probability-item">
                    <div className="probability-item__row">
                      <span>Spam</span>
                      <strong>{formatPercent(result?.probabilities?.spam)}</strong>
                    </div>
                    <div className="meter meter--warning">
                      <span style={{ width: `${Math.min(Math.max((result?.probabilities?.spam ?? 0) * 100, 0), 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  )
}

export default App