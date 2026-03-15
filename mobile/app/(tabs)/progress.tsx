import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert, SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "../../lib/theme";

function getISOWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function ProgressScreen() {
  const [uploading, setUploading] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  const history = useQuery(api.checkins.getCheckInHistory) ?? [];
  const generateUploadUrl = useMutation(api.meals.generateUploadUrl);
  const saveCheckIn = useMutation(api.checkins.saveCheckIn);
  const analyzeProgressPhoto = useAction(api.checkins.analyzeProgressPhoto);

  const today = new Date();
  const weekNumber = getISOWeekNumber(today);
  const year = today.getFullYear();

  const alreadyCheckedInThisWeek = history.some(
    (c) => c.weekNumber === weekNumber && c.year === year
  );

  const submitCheckIn = async (fromCamera: boolean) => {
    const fn = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await fn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      const { storageId } = await uploadResponse.json();

      const checkInId = await saveCheckIn({
        weekNumber,
        year,
        photoStorageId: storageId,
        weightKg: weightInput ? Number(weightInput) : undefined,
      });

      // Get previous week's check-in photo for diff
      const prevCheckIn = history[0];
      await analyzeProgressPhoto({
        checkInId,
        currentPhotoStorageId: storageId,
        previousPhotoStorageId: prevCheckIn?.photoStorageId,
      });

      Alert.alert("Check-in saved! 🎉", "Your AI progress analysis is ready!");
    } catch (err) {
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Weekly Progress</Text>
        <Text style={styles.subtitle}>Track your transformation week by week</Text>

        {/* Weekly Check-in Card */}
        <View style={styles.checkInCard}>
          {alreadyCheckedInThisWeek ? (
            <View style={styles.doneState}>
              <Text style={styles.doneIcon}>✅</Text>
              <Text style={styles.doneText}>Week {weekNumber} check-in done!</Text>
              <Text style={styles.doneSubtext}>Come back next week</Text>
            </View>
          ) : (
            <View style={styles.checkInPrompt}>
              <Text style={styles.checkInWeek}>Week {weekNumber} Check-In</Text>
              <Text style={styles.checkInDesc}>
                Submit your progress photo. AI will compare it to last week's!
              </Text>
              {uploading ? (
                <View style={styles.uploadingState}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.uploadingText}>Uploading & analyzing...</Text>
                </View>
              ) : (
                <View style={styles.checkInBtns}>
                  <TouchableOpacity
                    style={[styles.checkInBtn, styles.checkInBtnPrimary]}
                    onPress={() => submitCheckIn(true)}
                  >
                    <Text style={styles.checkInBtnIcon}>📸</Text>
                    <Text style={styles.checkInBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.checkInBtn, styles.checkInBtnSecondary]}
                    onPress={() => submitCheckIn(false)}
                  >
                    <Text style={styles.checkInBtnIcon}>🖼️</Text>
                    <Text style={styles.checkInBtnText}>From Library</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Photo Timeline */}
        <Text style={styles.sectionTitle}>Photo Timeline</Text>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyText}>No check-ins yet</Text>
            <Text style={styles.emptySubtext}>Submit your first weekly photo above!</Text>
          </View>
        ) : (
          history.map((c, i) => (
            <View key={c._id} style={styles.checkInHistoryCard}>
              <View style={styles.checkInHistoryHeader}>
                <Text style={styles.checkInHistoryWeek}>Week {c.weekNumber}, {c.year}</Text>
                {c.weightKg && (
                  <View style={styles.weightBadge}>
                    <Text style={styles.weightText}>{c.weightKg} kg</Text>
                  </View>
                )}
              </View>
              {c.photoUrl && (
                <Image
                  source={{ uri: c.photoUrl }}
                  style={styles.progressPhoto}
                  resizeMode="cover"
                />
              )}
              {c.diffVsPreviousWeek && i < history.length - 1 && (
                <View style={styles.diffCard}>
                  <Text style={styles.diffLabel}>📊 AI Progress Diff</Text>
                  <Text style={styles.diffText}>{c.diffVsPreviousWeek}</Text>
                </View>
              )}
              {c.aiAnalysis && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisLabel}>🤖 AI Analysis</Text>
                  <Text style={styles.analysisText}>{c.aiAnalysis}</Text>
                </View>
              )}
            </View>
          ))
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

  checkInCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.primary + "40" },
  doneState: { alignItems: "center", padding: Spacing.md },
  doneIcon: { fontSize: 48, marginBottom: Spacing.sm },
  doneText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: FontWeight.bold },
  doneSubtext: { fontSize: FontSize.sm, color: Colors.textMuted },
  checkInPrompt: { gap: Spacing.md },
  checkInWeek: { fontSize: FontSize.xl, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  checkInDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },
  checkInBtns: { flexDirection: "row", gap: Spacing.md },
  checkInBtn: { flex: 1, borderRadius: Radius.md, padding: Spacing.lg, alignItems: "center", gap: 6 },
  checkInBtnPrimary: { backgroundColor: Colors.primary },
  checkInBtnSecondary: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  checkInBtnIcon: { fontSize: 28 },
  checkInBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.background },
  uploadingState: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md },
  uploadingText: { color: Colors.textSecondary, fontSize: FontSize.sm },

  sectionTitle: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  emptyState: { alignItems: "center", padding: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: FontWeight.semibold, marginBottom: 4 },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: "center" },

  checkInHistoryCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, marginBottom: Spacing.md, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  checkInHistoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.md },
  checkInHistoryWeek: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  weightBadge: { backgroundColor: Colors.primary + "20", paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  weightText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.bold },
  progressPhoto: { width: "100%", height: 240, backgroundColor: Colors.surfaceElevated },
  diffCard: { margin: Spacing.md, padding: Spacing.md, backgroundColor: Colors.primaryGlow, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + "30" },
  diffLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold, marginBottom: 6 },
  diffText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  analysisCard: { margin: Spacing.md, marginTop: 0, padding: Spacing.md, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md },
  analysisLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.bold, marginBottom: 6 },
  analysisText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
