"use client"

import { useState, useEffect } from "react"
import styles from "../Log.module.css"
import type { QuantityPickerProps, QtyMode, ScaledMacros, DBFood } from "../types"

/**
 * QuantityPicker - Full-screen modal for setting portion size
 * Supports servings (0.5 increments) or grams with real-time macro preview
 */
export function QuantityPicker({ food, onConfirm, onCancel, saving }: QuantityPickerProps) {
  const [mode, setMode] = useState<QtyMode>("servings")
  const [servings, setServings] = useState(1)
  const [grams, setGrams] = useState("100")

  // Calculate multiplier based on mode
  const multiplier =
    mode === "servings"
      ? servings
      : (parseFloat(grams) || 0) / 100 // Base values per 100g

  const scaled: ScaledMacros = {
    cals: Math.round(food.cals * multiplier),
    protein: Math.round(food.protein * multiplier),
    carbs: Math.round(food.carbs * multiplier),
    fat: Math.round(food.fat * multiplier),
  }

  const servingLabel =
    mode === "servings"
      ? `${servings} serving${servings !== 1 ? "s" : ""}`
      : `${grams || 0}g`

  // Handle Escape key to close modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onCancel])

  return (
    <div className={styles.qtyPicker} role="dialog" aria-modal="true" aria-label="Set quantity">
      {/* Header */}
      <div className={styles.qtyHeader}>
        <span className={styles.qtyFoodEmoji}>{food.emoji}</span>
        <div className={styles.qtyFoodInfo}>
          <span className={styles.qtyFoodName}>{food.name}</span>
          <span className={styles.qtyFoodBase}>
            {food.cals} kcal · {food.protein}g P per serving
          </span>
        </div>
        <button className={styles.qtyCancelIcon} onClick={onCancel} aria-label="Cancel">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Mode toggle */}
      <div className={styles.qtyModeRow} role="group" aria-label="Measure by">
        <button
          className={`${styles.qtyModeBtn} ${mode === "servings" ? styles.qtyModeBtnActive : ""}`}
          onClick={() => setMode("servings")}
          aria-pressed={mode === "servings"}
        >
          <span className="material-symbols-outlined">dinner_dining</span>
          Servings
        </button>
        <button
          className={`${styles.qtyModeBtn} ${mode === "grams" ? styles.qtyModeBtnActive : ""}`}
          onClick={() => setMode("grams")}
          aria-pressed={mode === "grams"}
        >
          <span className="material-symbols-outlined">scale</span>
          By weight
        </button>
      </div>

      {/* Input area */}
      {mode === "servings" ? (
        <div className={styles.qtyStepper}>
          <button
            className={styles.qtyStep}
            onClick={() =>
              setServings((s) => Math.max(0.5, parseFloat((s - 0.5).toFixed(1))))
            }
            aria-label="Decrease"
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
          <div className={styles.qtyStepVal}>
            <span className={styles.qtyStepNum}>{servings}</span>
            <span className={styles.qtyStepUnit}>{`serving${servings !== 1 ? "s" : ""}`}</span>
          </div>
          <button
            className={styles.qtyStep}
            onClick={() => setServings((s) => parseFloat((s + 0.5).toFixed(1)))}
            aria-label="Increase"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      ) : (
        <div className={styles.qtyGramsRow}>
          <input
            className={styles.qtyGramsInput}
            type="number"
            min="1"
            step="1"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            aria-label="Weight in grams"
            autoFocus
          />
          <span className={styles.qtyGramsUnit}>g</span>
        </div>
      )}

      {/* Live macro preview */}
      <div className={styles.qtyPreview} aria-live="polite">
        <div className={styles.qtyPreviewItem}>
          <span className={styles.qtyPreviewVal} style={{ color: "var(--primary)" }}>
            {scaled.cals}
          </span>
          <span className={styles.qtyPreviewKey}>kcal</span>
        </div>
        <div className={styles.qtyPreviewDiv} />
        <div className={styles.qtyPreviewItem}>
          <span className={styles.qtyPreviewVal} style={{ color: "var(--accent-green)" }}>
            {scaled.protein}g
          </span>
          <span className={styles.qtyPreviewKey}>Protein</span>
        </div>
        <div className={styles.qtyPreviewItem}>
          <span className={styles.qtyPreviewVal} style={{ color: "var(--accent-purple)" }}>
            {scaled.carbs}g
          </span>
          <span className={styles.qtyPreviewKey}>Carbs</span>
        </div>
        <div className={styles.qtyPreviewItem}>
          <span className={styles.qtyPreviewVal} style={{ color: "var(--fat)" }}>
            {scaled.fat}g
          </span>
          <span className={styles.qtyPreviewKey}>Fat</span>
        </div>
      </div>

      {/* Confirm */}
      <button
        className={styles.qtyConfirmBtn}
        onClick={() => onConfirm(food, mode === "servings" ? servings : multiplier, mode)}
        disabled={
          saving || (mode === "grams" && (!parseFloat(grams) || parseFloat(grams) <= 0))
        }
        id="qty-confirm-btn"
      >
        {saving ? (
          <>
            <div className={styles.spinSm} />
            Logging…
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">add_circle</span>
            Log {servingLabel} of {food.name}
          </>
        )}
      </button>
    </div>
  )
}
