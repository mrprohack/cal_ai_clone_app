import { useState, useCallback } from "react"
import { AiMealResult } from "../types"
import { useImageQuality } from "./useImageQuality"

/**
 * useAIScan - Hook for AI meal scanning workflow
 * Handles file validation, upload, analysis, and confidence-based confirmation
 */
export function useAIScan(onComplete?: (result: AiMealResult) => void) {
  const [scanState, setScanState] = useState<"idle" | "uploading" | "analysing" | "done" | "error">("idle")
  const [preview, setPreview] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<AiMealResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)

  const { isValid, error: qualityError, warning, validateImage } = useImageQuality()

  const handleFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate image quality before proceeding
    const valid = await validateImage(file)
    if (!valid) {
      setError(qualityError || "Image validation failed")
      setScanState("error")
      return
    }

    // Show warning if image quality is questionable (but still allow)
    if (warning) {
      setError(warning)
    }

    setPreview(URL.createObjectURL(file))
    setAiResult(null)
    setError(null)
    setScanState("uploading")

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        setScanState("analysing")

        // Convert to base64
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(",")[1]
        const mimeType = file.type || "image/jpeg"

        // Call AI analysis API
        const res = await fetch("/api/analyze-meal.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: "Request failed" }))
          throw new Error(errData.error || `HTTP ${res.status}`)
        }

        const result: AiMealResult = await res.json()

        // Handle confidence-based validation
        if (result.confidence < 85) {
          setAiResult(result)
          setRequiresConfirmation(true)
          setScanState("done")
        } else {
          setAiResult(result)
          setRequiresConfirmation(false)
          setScanState("done")
        }
      } catch (err: any) {
        console.error("[useAIScan] Analysis failed:", err)
        setError(err?.message || "AI analysis failed")
        setScanState("error")
        throw err
      }
    }

    reader.onerror = () => {
      setError("Failed to read image file")
      setScanState("error")
    }

    reader.readAsDataURL(file)
  }, [validateImage, qualityError, warning])

  const confirmLowConfidence = useCallback(() => {
    if (aiResult && onComplete) {
      onComplete(aiResult)
      resetScan()
    }
  }, [aiResult, onComplete])

  const resetScan = useCallback(() => {
    setScanState("idle")
    setPreview(null)
    setAiResult(null)
    setError(null)
    setRequiresConfirmation(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith("image/")) return

    // Create fake change event to reuse handleFile logic
    const fakeEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>

    await handleFile(fakeEvent)
  }, [handleFile])

  return {
    scanState,
    preview,
    aiResult,
    error,
    isValid,
    qualityError,
    warning,
    requiresConfirmation,
    handleFile,
    handleDrop,
    confirmLowConfidence,
    resetScan,
  }
}