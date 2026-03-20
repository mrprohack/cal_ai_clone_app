import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@/lib/auth-context"
import type { DailyTotals } from "../types"

/**
 * useProgressSync - Hook for synchronizing daily progress data
 * Automatically syncs calorie and macro consumption to progress tracking
 */
export function useProgressSync(date: string, todayTotals: DailyTotals) {
  const { user } = useAuth()
  const userId = user?._id as any
  const upsertProgress = useMutation(api.progress.upsert)

  const syncProgress = async (delta?: Partial<DailyTotals>) => {
    if (!userId) return

    const caloriesConsumed = Math.round(todayTotals.cals + (delta?.cals || 0))
    const proteinConsumed = Math.round(todayTotals.protein + (delta?.protein || 0))
    const carbsConsumed = Math.round(todayTotals.carbs + (delta?.carbs || 0))
    const fatConsumed = Math.round(todayTotals.fat + (delta?.fat || 0))

    await upsertProgress({
      userId,
      date,
      caloriesConsumed,
      proteinConsumed,
      carbsConsumed,
      fatConsumed,
      recordedAt: Date.now(),
    })
  }

  return { syncProgress, userId }
}