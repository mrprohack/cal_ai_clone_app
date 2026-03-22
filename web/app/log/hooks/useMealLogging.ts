import { useState } from "react"
import { log as logMeal, remove as removeMeal } from "@/lib/actions/meals"
import type { ManualForm } from "../types"
import type { AiMealResult } from "../types"

/**
 * useMealLogging - Hook for all meal logging operations
 * Centralizes log, delete, and manual entry logic with loading state
 */
export function useMealLogging() {
  const [saving, setSaving] = useState(false)

  const handleLog = async (data: {
    userId: number
    name: string
    mealType: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    servingSize?: string
    date: string
    loggedAt: number
    aiGenerated?: boolean
  }) => {
    setSaving(true)
    try {
      await logMeal(data)
      return { success: true }
    } catch (error) {
      console.error("Failed to log meal:", error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleLogFromAI = async (aiResult: AiMealResult, mealType: string, userId: string, date: string) => {
    return handleLog({
      userId: Number(userId),
      name: aiResult.name,
      mealType,
      calories: aiResult.calories,
      proteinG: aiResult.proteinG,
      carbsG: aiResult.carbsG,
      fatG: aiResult.fatG,
      servingSize: aiResult.servingSize,
      date,
      loggedAt: Date.now(),
      aiGenerated: true,
    })
  }

  const handleDelete = async (id: number) => {
    try {
      await removeMeal(id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete meal:", error)
      throw error
    }
  }

  const handleLogManual = async (
    form: ManualForm,
    mealType: string,
    userId: string,
    date: string
  ) => {
    const cals = parseFloat(form.calories) || 0
    const protein = parseFloat(form.protein) || 0
    const carbs = parseFloat(form.carbs) || 0
    const fat = parseFloat(form.fat) || 0

    return handleLog({
      userId: Number(userId),
      name: form.name,
      mealType,
      calories: cals,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      servingSize: form.servingSize || "1 serving",
      date,
      loggedAt: Date.now(),
      aiGenerated: false,
    })
  }

  return {
    saving,
    handleLog,
    handleLogFromAI,
    handleDelete,
    handleLogManual,
  }
}