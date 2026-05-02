import { useState, useEffect } from "react"
import IntroPage from "./components/IntroPage"
import UploadPage from "./components/UploadPage"
import AnalysisPage from "./components/AnalysisPage"
import "./index.css"

export default function App() {
  const [page, setPage] = useState("intro") // intro | upload | analysis
  const [result, setResult] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const API_URL = "https://networkdetector.onrender.com";

  async function handleUpload(file) {
    setLoading(true)
    setError(null)
    setPreview(URL.createObjectURL(file))
    setPage("analysis")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("API error: " + res.status)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setPage("upload")
    setResult(null)
    setPreview(null)
    setError(null)
    setLoading(false)
  }

  return (
    <div className="app-root">
      {page === "intro" && <IntroPage onEnter={() => setPage("upload")} />}
      {page === "upload" && <UploadPage onUpload={handleUpload} />}
      {page === "analysis" && (
        <AnalysisPage
          result={result}
          preview={preview}
          loading={loading}
          error={error}
          onReset={handleReset}
        />
      )}
    </div>
  )
}