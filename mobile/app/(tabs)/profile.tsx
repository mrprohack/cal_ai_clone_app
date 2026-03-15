import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, SafeAreaView, Switch,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "../../lib/theme";

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "🔥 Lose Weight",
  gain_muscle: "💪 Gain Muscle",
  maintain: "⚖️ Maintain",
};

export default function ProfileScreen() {
  const user = useQuery(api.users.getMe);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const suggestCalories = useMutation(api.users.suggestCalorieTarget);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    age: "",
    weightKg: "",
    heightCm: "",
    goalType: "maintain" as "lose_weight" | "gain_muscle" | "maintain",
    dailyCalorieTarget: "",
    dailyProteinTarget: "",
  });
  const [sex, setSex] = useState<"male" | "female">("male");
  const [activity, setActivity] = useState<"sedentary" | "light" | "moderate" | "active" | "very_active">("moderate");

  const startEdit = () => {
    if (user) {
      setForm({
        age: String(user.age ?? ""),
        weightKg: String(user.weightKg ?? ""),
        heightCm: String(user.heightCm ?? ""),
        goalType: (user.goalType as any) ?? "maintain",
        dailyCalorieTarget: String(user.dailyCalorieTarget ?? ""),
        dailyProteinTarget: String(user.dailyProteinTarget ?? ""),
      });
    }
    setEditing(true);
  };

  const autoCalculate = async () => {
    if (!form.age || !form.weightKg || !form.heightCm) {
      Alert.alert("Missing info", "Please enter age, weight, and height first.");
      return;
    }
    const result = await suggestCalories({
      age: Number(form.age),
      weightKg: Number(form.weightKg),
      heightCm: Number(form.heightCm),
      sex,
      activityLevel: activity,
      goalType: form.goalType,
    });
    setForm((f) => ({
      ...f,
      dailyCalorieTarget: String(result.dailyCalorieTarget),
      dailyProteinTarget: String(result.dailyProteinTarget),
    }));
    Alert.alert(
      "Targets calculated! 🎯",
      `TDEE: ${result.tdee} kcal\nCalorie target: ${result.dailyCalorieTarget} kcal\nProtein: ${result.dailyProteinTarget}g`
    );
  };

  const saveProfile = async () => {
    await updateProfileMutation({
      age: form.age ? Number(form.age) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
      goalType: form.goalType,
      dailyCalorieTarget: form.dailyCalorieTarget ? Number(form.dailyCalorieTarget) : undefined,
      dailyProteinTarget: form.dailyProteinTarget ? Number(form.dailyProteinTarget) : undefined,
    });
    setEditing(false);
    Alert.alert("Profile saved! ✅");
  };

  if (!user) return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.loading}>Loading profile...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Goal */}
        <View style={styles.goalBanner}>
          <Text style={styles.goalLabel}>Current Goal</Text>
          <Text style={styles.goalValue}>{GOAL_LABELS[user.goalType ?? "maintain"] ?? "—"}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: "Calories", value: user.dailyCalorieTarget ? `${user.dailyCalorieTarget} kcal` : "—" },
            { label: "Protein", value: user.dailyProteinTarget ? `${user.dailyProteinTarget}g` : "—" },
            { label: "Weight", value: user.weightKg ? `${user.weightKg} kg` : "—" },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {!editing ? (
          <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
            <Text style={styles.editBtnText}>✏️ Edit Profile & Targets</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editForm}>
            <Text style={styles.formSection}>Body Stats</Text>
            {[
              { key: "age", label: "Age (years)" },
              { key: "weightKg", label: "Weight (kg)" },
              { key: "heightCm", label: "Height (cm)" },
            ].map(({ key, label }) => (
              <View key={key} style={styles.inputRow}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            ))}

            <Text style={styles.formSection}>Goal</Text>
            <View style={styles.goalRow}>
              {(["lose_weight", "gain_muscle", "maintain"] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.goalBtn, form.goalType === g && styles.goalBtnActive]}
                  onPress={() => setForm((f) => ({ ...f, goalType: g }))}
                >
                  <Text style={[styles.goalBtnText, form.goalType === g && styles.goalBtnTextActive]}>
                    {GOAL_LABELS[g]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formSection}>Sex & Activity (for auto-calc)</Text>
            <View style={styles.sexRow}>
              {(["male", "female"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.goalBtn, sex === s && styles.goalBtnActive]}
                  onPress={() => setSex(s)}
                >
                  <Text style={[styles.goalBtnText, sex === s && styles.goalBtnTextActive]}>
                    {s === "male" ? "♂ Male" : "♀ Female"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.calcBtn} onPress={autoCalculate}>
              <Text style={styles.calcBtnText}>🧮 Auto-Calculate Targets</Text>
            </TouchableOpacity>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Daily Calories (kcal)</Text>
              <TextInput
                style={styles.input}
                value={form.dailyCalorieTarget}
                onChangeText={(v) => setForm((f) => ({ ...f, dailyCalorieTarget: v }))}
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Daily Protein (g)</Text>
              <TextInput
                style={styles.input}
                value={form.dailyProteinTarget}
                onChangeText={(v) => setForm((f) => ({ ...f, dailyProteinTarget: v }))}
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  loading: { color: Colors.textSecondary, padding: Spacing.xl, textAlign: "center" },
  title: { fontSize: FontSize.xxl, color: Colors.textPrimary, fontWeight: FontWeight.extrabold, marginBottom: Spacing.xl },

  avatarSection: { alignItems: "center", marginBottom: Spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  avatarText: { fontSize: FontSize.xxl, color: Colors.background, fontWeight: FontWeight.extrabold },
  userName: { fontSize: FontSize.xl, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  userEmail: { fontSize: FontSize.sm, color: Colors.textSecondary },

  goalBanner: { backgroundColor: Colors.primaryGlow, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: "center", marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + "30" },
  goalLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  goalValue: { fontSize: FontSize.xl, color: Colors.textPrimary, fontWeight: FontWeight.extrabold },

  statsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.extrabold, marginBottom: 2 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

  editBtn: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  editBtnText: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.bold },

  editForm: { gap: Spacing.md },
  formSection: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.bold, textTransform: "uppercase", letterSpacing: 1, marginTop: Spacing.md },
  inputRow: { gap: 6 },
  inputLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border },

  goalRow: { flexDirection: "column", gap: Spacing.sm },
  goalBtn: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  goalBtnActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
  goalBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  goalBtnTextActive: { color: Colors.primary },

  sexRow: { flexDirection: "row", gap: Spacing.sm },
  calcBtn: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  calcBtnText: { color: Colors.textPrimary, fontWeight: FontWeight.bold, fontSize: FontSize.sm },

  formActions: { gap: Spacing.sm, marginTop: Spacing.md },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: "center" },
  saveBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.background },
  cancelBtn: { alignItems: "center", padding: Spacing.md },
  cancelBtnText: { fontSize: FontSize.sm, color: Colors.textMuted },
});
