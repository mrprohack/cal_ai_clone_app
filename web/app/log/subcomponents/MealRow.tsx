"use client"

import { useState } from "react"
import styles from "../Log.module.css"
import { MEAL_TYPES } from "../types"
import type { MealRowProps } from "../types"

/**
 * MealRow - Compact meal entry with delete workflow
 * Memoized with custom comparison to avoid unnecessary re-renders
 */
export const MealRow = React.memo<MealRowProps>(function MealRow({ meal, onDelete }) {
  const [confirm, setConfirm] = useState(false)
  const meta = MEAL_TYPES.find((m) => m.id === meal.mealType) ?? MEAL_TYPES[0]

  return (
    <div className={styles.mealRow}>
      <div className={styles.mealRowLeft}>
        <div className={styles.mealRowDot} style={{ background: meta.color }} />
        <div>
          <div className={styles.mealRowName}>{meal.name}</div>
          <div className={styles.mealRowMeta} style={{ color: meta.color }}>
            {meta.icon} {meta.label}
            <span className={styles.mealRowDivider}>·</span>
            <span style={{ color: "var(--text-muted)" }}>
              {Math.round(meal.proteinG)}P · {Math.round(meal.carbsG)}C · {Math.round(meal.fatG)}F
            </span>
          </div>
        </div>
      </div>
      <div className={styles.mealRowRight}>
        <span className={styles.mealRowCals}>{Math.round(meal.calories)}</span>
        <span className={styles.mealRowKcal}>kcal</span>
        {confirm ? (
          <div className={styles.mealRowConfirm}>
            <button className={styles.confirmYes} onClick={() => onDelete(meal._id)} aria-label="Confirm delete">
              <span className="material-symbols-outlined">check</span>
            </button>
            <button className={styles.confirmNo} onClick={() => setConfirm(false)} aria-label="Cancel">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        ) : (
          <button className={styles.mealRowDel} onClick={() => setConfirm(true)} aria-label="Delete meal">
            <span className="material-symbols-outlined">delete_outline</span>
          </button>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if meal ID changed or onDelete function changed
  return prevProps.meal._id === nextProps.meal._id && prevProps.onDelete === nextProps.onDelete
})

MealRow.displayName = "MealRow"
