import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { ManualForm } from "../types"
import type { AiMealResult } from "../types"

/**
 * useMealLogging - Hook for all meal logging operations
 * Centralizes log, delete, and manual entry logic with loading state
 */
export function useMealLogging() {
  const [saving, setSaving] = useState(false)
  const logMeal = useMutation(api.meals.log)
  const removeMeal = useMutation(api.meals.remove)

  const handleLog = async (data: {
    userId: Id<"users">
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
      userId: userId as Id<"users">,
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

  const handleDelete = async (id: string) => {
    try {
      await removeMeal({ id: id as any })
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
      userId: userId as Id<"users">,
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