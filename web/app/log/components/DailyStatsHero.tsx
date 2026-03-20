"use client"

import { useMemo } from "react"
import { CalRing } from "../subcomponents/CalRing"
import { MacroBar } from "../subcomponents/MacroBar"
import type { DailyStatsHeroProps } from "../types"

/**
 * DailyStatsHero - Combined section showing calorie ring + macro progress bars
 * Memoized computation of today's totals from meals array
 */
export function DailyStatsHero({ meals, calorieGoal, proteinGoal, carbsGoal, fatGoal }: DailyStatsHeroProps) {
  // Memoize expensive calculation of today's totals
  const todayTotals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        cals: acc.cals + (m.calories ?? 0),
        protein: acc.protein + (m.proteinG ?? 0),
        carbs: acc.carbs + (m.carbsG ?? 0),
        fat: acc.fat + (m.fatG ?? 0),
      }),
      { cals: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [meals])

  const calPct = Math.min((todayTotals.cals / calorieGoal) * 100, 100)
  const isOverGoal = todayTotals.cals > calorieGoal

  return (
    <section className="statsHero" id="log-today-bar" aria-label="Today's nutrition summary">
      {/* Calorie progress ring */}
      <CalRing pct={calPct} cals={todayTotals.cals} goal={calorieGoal} isOver={isOverGoal} />

      {/* Macro progress bars */}
      <div className="macroBarsCol">
        <div className="macroBarsTitle">
          <span className="material-symbols-outlined">bar_chart</span>
          Today's Macros
        </div>
        <MacroBar
          label="Protein"
          value={todayTotals.protein}
          target={proteinGoal}
          color="var(--accent-green)"
        />
        <MacroBar
          label="Carbs"
          value={todayTotals.carbs}
          target={carbsGoal}
          color="var(--accent-purple)"
        />
        <MacroBar
          label="Fat"
          value={todayTotals.fat}
          target={fatGoal}
          color="var(--fat)"
        />
      </div>

      {/* Meal count and status */}
      <div className="heroMeta">
        <div className="heroMetaItem">
          <span className="heroMetaVal">{meals.length}</span>
          <span className="heroMetaKey">Meals</span>
        </div>
        <div className="heroMetaDivider" />
        <div className="heroMetaItem">
          <span
            className="heroMetaVal"
            style={{ color: isOverGoal ? "var(--fat)" : "var(--accent-green)" }}
          >
            {isOverGoal ? "Over" : "On track"}
          </span>
          <span className="heroMetaKey">Status</span>
        </div>
      </div>
    </section>
  )
}
