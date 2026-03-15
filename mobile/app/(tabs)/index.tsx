import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "../../lib/theme";

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
  const pct = Math.min((consumed / target) * 100, 100);
  const remaining = Math.max(target - consumed, 0);
  const over = consumed > target;

  return (
    <View style={styles.ringContainer}>
      <View style={[styles.ring, { borderColor: over ? Colors.error : Colors.primary }]}>
        <View style={[styles.ringFill, { height: `${pct}%` as any, backgroundColor: over ? Colors.error + "30" : Colors.primaryGlow }]} />
        <View style={styles.ringContent}>
          <Text style={[styles.ringNumber, { color: over ? Colors.error : Colors.primary }]}>
            {consumed}
          </Text>
          <Text style={styles.ringLabel}>kcal eaten</Text>
          <View style={styles.ringDivider} />
          <Text style={styles.ringRemaining}>
            {over ? `${consumed - target} over` : `${remaining} left`}
          </Text>
          <Text style={styles.ringTarget}>of {target}</Text>
        </View>
      </View>
    </View>
  );
}

function MacroBar({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroValue, { color }]}>{current}g</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroBar, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroTarget}>/ {target}g</Text>
    </View>
  );
}

function MealCard({ meal }: { meal: any }) {
  return (
    <View style={styles.mealCard}>
      <View style={styles.mealRow}>
        <View>
          <Text style={styles.mealType}>{meal.mealType.toUpperCase()}</Text>
          <Text style={styles.mealFoods}>
            {meal.foods.map((f: any) => f.name).join(", ")}
          </Text>
        </View>
        <View style={styles.mealRight}>
          <Text style={styles.mealCal}>{Math.round(meal.totalCalories)}</Text>
          <Text style={styles.mealCalLabel}>kcal</Text>
        </View>
      </View>
      <View style={styles.mealMacros}>
        <Text style={[styles.mealMacro, { color: Colors.protein }]}>
          P {Math.round(meal.totalProtein)}g
        </Text>
        <Text style={[styles.mealMacro, { color: Colors.carbs }]}>
          C {Math.round(meal.totalCarbs)}g
        </Text>
        <Text style={[styles.mealMacro, { color: Colors.fat }]}>
          F {Math.round(meal.totalFat)}g
        </Text>
        {meal.aiConfidence && (
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>AI {Math.round(meal.aiConfidence * 100)}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const today = new Date().toISOString().split("T")[0];
  const meals = useQuery(api.meals.getTodayMeals, { date: today }) ?? [];
  const summary = useQuery(api.daily.getDailySummary, { date: today });
  const user = useQuery(api.users.getMe);

  const calorieTarget = user?.dailyCalorieTarget ?? 2000;
  const proteinTarget = user?.dailyProteinTarget ?? 150;
  const consumed = summary?.totalCalories ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()} 👋</Text>
            <Text style={styles.userName}>{user?.name ?? "Athlete"}</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Calorie Ring */}
        <CalorieRing consumed={consumed} target={calorieTarget} />

        {/* Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macros</Text>
          <View style={styles.macroGrid}>
            <MacroBar label="Protein" current={summary?.totalProtein ?? 0} target={proteinTarget} color={Colors.protein} />
            <MacroBar label="Carbs" current={summary?.totalCarbs ?? 0} target={Math.round(calorieTarget * 0.45 / 4)} color={Colors.carbs} />
            <MacroBar label="Fat" current={summary?.totalFat ?? 0} target={Math.round(calorieTarget * 0.25 / 9)} color={Colors.fat} />
          </View>
        </View>

        {/* Water & Workout */}
        <View style={styles.quickRow}>
          <View style={[styles.quickCard, { borderColor: Colors.protein + "40" }]}>
            <Text style={styles.quickIcon}>💧</Text>
            <Text style={styles.quickValue}>{((summary?.waterMl ?? 0) / 1000).toFixed(1)}L</Text>
            <Text style={styles.quickLabel}>Water</Text>
          </View>
          <View style={[styles.quickCard, { borderColor: Colors.primary + "40" }]}>
            <Text style={styles.quickIcon}>{summary?.workoutDone ? "🔥" : "💤"}</Text>
            <Text style={styles.quickValue}>{summary?.workoutDone ? "Done!" : "Rest"}</Text>
            <Text style={styles.quickLabel}>Workout</Text>
          </View>
          <View style={[styles.quickCard, { borderColor: Colors.carbs + "40" }]}>
            <Text style={styles.quickIcon}>🍽️</Text>
            <Text style={styles.quickValue}>{meals.length}</Text>
            <Text style={styles.quickLabel}>Meals</Text>
          </View>
        </View>

        {/* Today's Meals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          {meals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyText}>No meals logged yet.</Text>
              <Text style={styles.emptySubtext}>Tap the Log tab to scan your food!</Text>
            </View>
          ) : (
            meals.map((m) => <MealCard key={m._id} meal={m} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.xl },
  greeting: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  userName: { fontSize: FontSize.xxl, color: Colors.textPrimary, fontWeight: FontWeight.extrabold },
  dateBadge: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  dateText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  ringContainer: { alignItems: "center", marginBottom: Spacing.xl },
  ring: { width: 200, height: 200, borderRadius: 100, borderWidth: 4, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: Colors.surface },
  ringFill: { position: "absolute", bottom: 0, left: 0, right: 0 },
  ringContent: { alignItems: "center", zIndex: 1 },
  ringNumber: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold },
  ringLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  ringDivider: { width: 40, height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  ringRemaining: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  ringTarget: { fontSize: FontSize.xs, color: Colors.textMuted },

  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.bold, marginBottom: Spacing.md },

  macroGrid: { gap: Spacing.sm },
  macroItem: { marginBottom: Spacing.sm },
  macroHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  macroLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  macroValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  macroTrack: { height: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 4, overflow: "hidden" },
  macroBar: { height: "100%", borderRadius: 4 },
  macroTarget: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },

  quickRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
  quickCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, alignItems: "center" },
  quickIcon: { fontSize: 24, marginBottom: 4 },
  quickValue: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  quickLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

  mealCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  mealRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  mealType: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold, letterSpacing: 1, marginBottom: 2 },
  mealFoods: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, maxWidth: "80%" },
  mealRight: { alignItems: "flex-end" },
  mealCal: { fontSize: FontSize.xl, color: Colors.accent, fontWeight: FontWeight.extrabold },
  mealCalLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  mealMacros: { flexDirection: "row", gap: Spacing.md, alignItems: "center" },
  mealMacro: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  aiTag: { marginLeft: "auto", backgroundColor: Colors.primary + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  aiTagText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },

  emptyState: { alignItems: "center", padding: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: FontWeight.semibold, marginBottom: 4 },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: "center" },
});
