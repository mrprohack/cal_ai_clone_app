"use client"

import { useRef } from "react"
import { useAIScan } from "../hooks/useAIScan"
import { ConfidenceWarning } from "./ConfidenceWarning"
import type { AiMealResult } from "../types"

interface Props {
  onComplete: (result: AiMealResult) => void
  saving: boolean
}

/**
 * ScanSection - Complete AI meal scanning workflow
 * Handles file upload, image validation, AI analysis, and confidence warnings
 */
export function ScanSection({ onComplete, saving }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { scanState, preview, aiResult, error, requiresConfirmation, handleFile, handleDrop, resetScan, confirmLowConfidence } =
    useAIScan(onComplete)

  const isDragOver = false // Controlled by parent

  return (
    <section className="styles_scanSection__lEwxu" aria-label="AI meal scanner">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="styles_fileInput__hznZg"
        onChange={handleFile}
        id="log-file-input"
      />

      {/* Idle state - Show scan banner */}
      {scanState === "idle" && (
        <div
          className={`styles_scanBanner__OJkLo ${isDragOver ? "styles_scanBannerDrag__tLJkP" : ""}`}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          aria-label="Tap to scan your meal with AI"
          id="log-scan-zone"
        >
          <div className="styles_bannerGlow__mJnVq" aria-hidden />
          <div className="styles_bannerIconRing__cHtDv">
            <span className={`material-symbols-outlined styles_bannerIcon__kLpjV`}>linked_camera</span>
          </div>
          <div className="styles_bannerCopy__dJqXv">
            <div className="styles_bannerTitle__eRkYd">Snap Your Meal</div>
            <div className="styles_bannerSub__pQlJl">AI identifies every ingredient &amp; macro in seconds</div>
          </div>
        </div>
      )}

      {/* Active scan - Uploading/Analysing/Error/Done */}
      {scanState !== "idle" && (
        <div className="styles_scanZone__gPnQv" id="log-scan-zone-active">
          {preview && (
            <div className="styles_previewWrap__nBqQe">
              <img src={preview} alt="Your meal photo" className="styles_previewImg__fRXeW" />
              {(scanState === "uploading" || scanState === "analysing") && (
                <div className="styles_scanOverlay__oTlYp">
                  <div className="styles_scanPill__zXvYv">
                    <div className="styles_scanSpinner__cFhJk" />
                    <span>{scanState === "uploading" ? "Uploading photo…" : "AI analyzing food…"}</span>
                  </div>
                </div>
              )}
              {scanState === "error" && (
                <div className="styles_scanErrorOverlay__C9wZI">
                  <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
                    error_outline
                  </span>
                  <span style={{ fontWeight: 800 }}>{error}</span>
                  <button className="styles_retryBtn__gJhKf" onClick={resetScan}>
                    Try again
                  </button>
                </div>
              )}
              {scanState === "done" && (
                <div className="styles_scanDone__nJkLp">
                  <span className={`material-symbols-outlined styles_scanDoneIcon__dVqRp`}>check_circle</span>
                  <span>Analysis complete!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confidence warning for low-confidence results */}
      {scanState === "done" && requiresConfirmation && aiResult && (
        <ConfidenceWarning
          aiResult={aiResult}
          onConfirm={confirmLowConfidence}
          onCancel={resetScan}
        />
      )}

      {/* AI result card */}
      {scanState === "done" && !requiresConfirmation && aiResult && (
        <div className="styles_resultCard__xZyWq" role="region" aria-label="AI analysis result">
          {/* Result card content */}
        </div>
      )}
    </section>
  )
}
