"use client"

import { MEAL_TYPES } from "../types"
import type { MealTypeId } from "../types"

interface Props {
  mealType: MealTypeId
  onChange: (type: MealTypeId) => void
}

/**
 * MealTypeSelector - Tabs for selecting meal type (breakfast/lunch/dinner/snack)
 * Auto-selects by time via parent component
 */
export function MealTypeSelector({ mealType, onChange }: Props) {
  return (
    <nav className="styles_mealTypeNav__kKlqL" aria-label="Meal type">
      {MEAL_TYPES.map((m) => {
        const active = mealType === m.id
        return (
          <button
            key={m.id}
            className={`styles_mealTypeTab__OJqvg ${active ? "styles_mealTypeTabActive__eUUXU" : ""}`}
            style={
              active
                ? {
                    background: m.gradient,
                    borderColor: `${m.color}55`,
                    color: m.color,
                  }
                : {}
            }
            onClick={() => onChange(m.id)}
            id={`log-meal-${m.id}`}
            aria-pressed={active}
          >
            <span className="styles_mealTypeTabIcon__mZyUP">{m.icon}</span>
            <span className="styles_mealTypeTabLabel__tNqLF">{m.label}</span>
            {active && <span className="styles_mealTypeTabIndicator__bJdZg" style={{ background: m.color }} />}
          </button>
        )
      })}
    </nav>
  )
}
