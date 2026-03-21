"use client"

import React from "react"

import styles from "../Log.module.css"
import type { FoodCardProps } from "../types"

/**
 * FoodCard - Quick-add food item with emoji and macros
 * Memoized to prevent re-render unless selection state changes
 */
export const FoodCard = React.memo<FoodCardProps>(function FoodCard({
  food,
  onSelect,
  isSelected,
  adding,
}) {
  return (
    <div
      className={`${styles.foodCard} ${isSelected ? styles.foodCardSelected : ""}`}
      role="listitem"
    >
      <span className={styles.foodCardEmoji}>{food.emoji}</span>
      <div className={styles.foodCardBody}>
        <div className={styles.foodCardName}>{food.name}</div>
        <div className={styles.foodCardMacros}>
          <span style={{ color: "var(--primary)" }}>{food.cals}</span>
          <span style={{ color: "var(--text-dim)" }}>kcal</span>
          <span className={styles.foodCardSep} />
          <span style={{ color: "var(--accent-green)" }}>{food.protein}P</span>
          <span style={{ color: "var(--accent-purple)" }}>{food.carbs}C</span>
          <span style={{ color: "var(--fat)" }}>{food.fat}F</span>
        </div>
      </div>
      <button
        className={`${styles.foodCardBtn} ${isSelected ? styles.foodCardBtnActive : ""}`}
        onClick={onSelect}
        disabled={adding}
        aria-label={`Select ${food.name}`}
      >
        <span className="material-symbols-outlined">
          {isSelected ? "expand_less" : "add"}
        </span>
      </button>
    </div>
  )
})

FoodCard.displayName = "FoodCard"
