import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "../../lib/theme";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type FoodItem = {
  name: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
type AIResult = { foods: FoodItem[]; confidence: number };

export default function LogMealScreen() {
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [editedFoods, setEditedFoods] = useState<FoodItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"select" | "confirm" | "done">("select");

  const generateUploadUrl = useMutation(api.meals.generateUploadUrl);
  const analyzeFoodPhoto = useAction(api.meals.analyzeFoodPhoto);

  const today = new Date().toISOString().split("T")[0];
  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

  const pickImage = async (fromCamera: boolean) => {
    const fn = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await fn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await uploadAndAnalyze(uri);
    }
  };

  const uploadAndAnalyze = async (uri: string) => {
    setAnalyzing(true);
    setStep("select");
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the image
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      const { storageId: sid } = await uploadResponse.json();
      setStorageId(sid);

      // Trigger AI analysis
      const result = await analyzeFoodPhoto({
        storageId: sid,
        date: today,
        mealType: selectedMealType,
      });

      setAiResult(result as AIResult);
      setEditedFoods(result.foods as FoodItem[]);
      setStep("confirm");
    } catch (err) {
      Alert.alert("Analysis failed", "Could not analyze the photo. Please try again.");
      setPhotoUri(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateFood = (idx: number, field: keyof FoodItem, value: string) => {
    setEditedFoods((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [field]: field === "name" ? value : Number(value) } : f))
    );
  };

  const confirmMeal = async () => {
    setSaving(true);
    setStep("done");
    setSaving(false);
    Alert.alert("Meal saved! ✅", "Your meal has been logged successfully.");
    setPhotoUri(null);
    setAiResult(null);
    setStep("select");
  };

  const totalCal = editedFoods.reduce((s, f) => s + f.calories, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.title}>Log a Meal</Text>
        <Text style={styles.subtitle}>Take a photo or pick from library</Text>

        {/* Meal Type Selector */}
        <View style={styles.mealTypeRow}>
          {mealTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.mealTypeBtn, selectedMealType === type && styles.mealTypeBtnActive]}
              onPress={() => setSelectedMealType(type)}
            >
              <Text style={[styles.mealTypeTxt, selectedMealType === type && styles.mealTypeTxtActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Capture Buttons */}
        {step === "select" && (
          <View style={styles.captureSection}>
            <TouchableOpacity
              style={[styles.captureBtn, styles.captureBtnPrimary]}
              onPress={() => pickImage(true)}
              disabled={analyzing}
            >
              <Text style={styles.captureBtnIcon}>📷</Text>
              <Text style={styles.captureBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.captureBtn, styles.captureBtnSecondary]}
              onPress={() => pickImage(false)}
              disabled={analyzing}
            >
              <Text style={styles.captureBtnIcon}>🖼️</Text>
              <Text style={styles.captureBtnText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analyzing State */}
        {analyzing && (
          <View style={styles.analyzingCard}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}
            <View style={styles.analyzingContent}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.analyzingText}>AI is analyzing your food...</Text>
              <Text style={styles.analyzingSubtext}>Identifying macros & calories</Text>
            </View>
          </View>
        )}

        {/* AI Result + Edit */}
        {step === "confirm" && aiResult && (
          <View>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.previewImage} />}

            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.resultTitle}>AI Analysis</Text>
                <Text style={styles.confidenceBadge}>
                  {Math.round((aiResult.confidence ?? 0) * 100)}% confidence
                </Text>
              </View>
              <View style={styles.totalCalBadge}>
                <Text style={styles.totalCalNum}>{Math.round(totalCal)}</Text>
                <Text style={styles.totalCalLabel}>kcal</Text>
              </View>
            </View>

            <Text style={styles.editHint}>Tap any value to edit</Text>

            {editedFoods.map((food, i) => (
              <View key={i} style={styles.foodCard}>
                <TextInput
                  style={styles.foodName}
                  value={food.name}
                  onChangeText={(v) => updateFood(i, "name", v)}
                  placeholderTextColor={Colors.textMuted}
                />
                <View style={styles.macroRow}>
                  {(["calories", "protein", "carbs", "fat"] as const).map((field) => (
                    <View key={field} style={styles.macroField}>
                      <Text style={[styles.macroFieldLabel, {
                        color: field === "protein" ? Colors.protein : field === "carbs" ? Colors.carbs : field === "fat" ? Colors.fat : Colors.accent,
                      }]}>
                        {field === "calories" ? "kcal" : field.charAt(0).toUpperCase()}
                      </Text>
                      <TextInput
                        style={styles.macroFieldInput}
                        value={String(Math.round(food[field]))}
                        onChangeText={(v) => updateFood(i, field, v)}
                        keyboardType="numeric"
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={confirmMeal}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.saveBtnText}>✅ Save Meal</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.retakeBtn} onPress={() => setStep("select")}>
              <Text style={styles.retakeBtnText}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, color: Colors.textPrimary, fontWeight: FontWeight.extrabold, marginBottom: 4 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },

  mealTypeRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  mealTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.surface, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  mealTypeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  mealTypeTxt: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  mealTypeTxtActive: { color: Colors.background },

  captureSection: { gap: Spacing.md },
  captureBtn: { borderRadius: Radius.lg, padding: Spacing.xl, alignItems: "center", gap: 8 },
  captureBtnPrimary: { backgroundColor: Colors.primary },
  captureBtnSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  captureBtnIcon: { fontSize: 40 },
  captureBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.background },

  previewImage: { width: "100%", height: 220, borderRadius: Radius.lg, marginBottom: Spacing.md, backgroundColor: Colors.surface },

  analyzingCard: { borderRadius: Radius.lg, overflow: "hidden", backgroundColor: Colors.surface },
  analyzingContent: { padding: Spacing.xl, alignItems: "center", gap: Spacing.sm },
  analyzingText: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  analyzingSubtext: { fontSize: FontSize.sm, color: Colors.textSecondary },

  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  resultTitle: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  confidenceBadge: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  totalCalBadge: { backgroundColor: Colors.accent + "20", borderRadius: Radius.md, padding: Spacing.sm, alignItems: "center" },
  totalCalNum: { fontSize: FontSize.xxl, color: Colors.accent, fontWeight: FontWeight.extrabold },
  totalCalLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

  editHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm, fontStyle: "italic" },
  foodCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  foodName: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 6 },
  macroRow: { flexDirection: "row", gap: Spacing.sm },
  macroField: { flex: 1, alignItems: "center" },
  macroFieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 4 },
  macroFieldInput: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.bold, textAlign: "center", backgroundColor: Colors.surfaceElevated, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, width: "100%" },

  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: "center", marginTop: Spacing.md },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.background },
  retakeBtn: { alignItems: "center", padding: Spacing.md, marginTop: Spacing.sm },
  retakeBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
