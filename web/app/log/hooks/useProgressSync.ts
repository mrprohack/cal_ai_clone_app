import { Progress } from "@/lib/phpApi"
import { useAuth } from "@/lib/auth-context"
import type { DailyTotals } from "../types"

/**
 * useProgressSync - Hook for synchronizing daily progress data
 * Automatically syncs calorie and macro consumption to progress tracking
 */
export function useProgressSync(date: string, todayTotals: DailyTotals) {
  const { user } = useAuth()
  const userId = user?.id ? Number(user.id) : null

  const syncProgress = async (delta?: Partial<DailyTotals>) => {
    if (!userId) return

    const caloriesConsumed = Math.round(todayTotals.cals + (delta?.cals || 0))
    const proteinConsumed = Math.round(todayTotals.protein + (delta?.protein || 0))
    const carbsConsumed = Math.round(todayTotals.carbs + (delta?.carbs || 0))
    const fatConsumed = Math.round(todayTotals.fat + (delta?.fat || 0))

    await Progress.upsert({
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