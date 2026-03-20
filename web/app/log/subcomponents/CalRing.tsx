import React from "react"
import styles from "../Log.module.css"
import type { CalRingProps } from "../types"

/**
 * CalRing - Animated SVG ring showing calorie progress
 * Memoized component to prevent unnecessary re-renders
 */
export const CalRing = React.memo<CalRingProps>(function CalRing({ pct, cals, goal, isOver }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(pct / 100, 1))

  return (
    <div className={styles.ringWrap} aria-label={`${Math.round(cals)} of ${goal} calories`}>
      <svg viewBox="0 0 120 120" className={styles.ringSvg}>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" stroke="rgba(255,255,255,0.06)" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="9"
          stroke={isOver ? "#fb923c" : "#3b96f5"}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "60px 60px",
            transition: "stroke-dashoffset 0.7s cubic-bezier(.34,1.56,.64,1), stroke 0.3s",
            filter: `drop-shadow(0 0 8px ${isOver ? "rgba(251,146,60,.6)" : "rgba(59,150,245,.6)"})`,
          }}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringCals} style={{ color: isOver ? "var(--fat)" : "var(--primary)" }}>
          {Math.round(cals).toLocaleString()}
        </span>
        <span className={styles.ringUnit}>kcal</span>
        <span className={styles.ringRemain} style={{ color: isOver ? "var(--fat)" : "var(--text-muted)" }}>
          {isOver ? `+${Math.round(cals - goal)}` : `${Math.round(goal - cals)} left`}
        </span>
      </div>
    </div>
  )
})

CalRing.displayName = "CalRing"
