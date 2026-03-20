import React from "react"
import styles from "../Log.module.css"
import type { MacroBarProps } from "../types"

/**
 * MacroBar - Slim horizontal macro progress bar
 * Memoized component to prevent unnecessary re-renders when props unchanged
 */
export const MacroBar = React.memo<MacroBarProps>(function MacroBar({ label, value, target, color }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0

  return (
    <div className={styles.macroBarRow}>
      <span className={styles.macroBarLabel}>{label}</span>
      <div className={styles.macroBarTrack}>
        <div
          className={styles.macroBarFill}
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
      <span className={styles.macroBarValue} style={{ color }}>
        {Math.round(value)}g
      </span>
    </div>
  )
})

MacroBar.displayName = "MacroBar"
