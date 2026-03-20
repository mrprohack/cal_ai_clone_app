"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { Id } from "@/convex/_generated/dataModel";
import styles from "./BodyScan.module.css";

/* ── Types ── */
interface BodyAnalysis {
  bodyFat: number;
  muscleDefinition: string;
  visibleMuscleGroups: string[];
  posture: string;
  estimatedBMICategory: string;
  fitnessLevel: string;
  strengths: string[];
  areasForImprovement: string[];
  weeklyChange: string | null;
  progressScore: number;
  notes: string;
  recommendations: string[];
}

interface PhotoEntry {
  _id: Id<"bodyPhotos">;
  date: string;
  imageData?: string;
  analysis?: string;
  weekLabel?: string;
  notes?: string;
  recordedAt: number;
}

const DEFINITION_COLORS: Record<string, string> = {
  low: "var(--text-muted)",
  moderate: "var(--accent-yellow)",
  good: "var(--accent-green)",
  excellent: "var(--primary)",
};

const FITNESS_LEVELS = ["beginner", "intermediate", "advanced", "elite"];

/* ── Score arc component ── */
function ScoreArc({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color =
    score >= 80 ? "var(--accent-green)"
    : score >= 60 ? "var(--primary)"
    : score >= 40 ? "var(--accent-yellow)"
    : "var(--fat)";

  return (
    <div className={styles.scoreArc}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--surface-elevated)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dasharray 1s var(--ease-spring)" }}
        />
      </svg>
      <div className={styles.scoreCenter}>
        <span className={styles.scoreNum}>{score}</span>
        <span className={styles.scoreLabel}>Score</span>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function BodyScanPage() {
  const { user } = useAuth();
  const userId = user?._id ? (user._id as unknown as Id<"users">) : null;

  const photos = useQuery(api.bodyPhotos.listPhotos, userId ? { userId } : "skip");
  const savePhoto = useMutation(api.bodyPhotos.savePhoto);
  const removePhoto = useMutation(api.bodyPhotos.removePhoto);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string>("");
  const [previewMime, setPreviewMime] = useState<string>("image/jpeg");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setAnalysis(null);
    setSaved(false);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewMime(file.type || "image/jpeg");

    // Convert to base64
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    setPreviewBase64(base64);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  const analyzePhoto = async () => {
    if (!previewBase64) return;
    setAnalyzing(true);
    setError("");

    // Get previous analysis for comparison
    const previousAnalysis =
      photos && photos.length > 0 && photos[0].analysis
        ? photos[0].analysis
        : undefined;

    try {
      const res = await fetch("/api/analyze-body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: previewBase64,
          mimeType: previewMime,
          previousAnalysis,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data as BodyAnalysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !analysis) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekNum = photos ? photos.length + 1 : 1;

      // Store a small thumbnail version
      let thumbnail = "";
      if (previewBase64.length < 500_000) {
        thumbnail = previewBase64;
      } else {
        // Compress via canvas
        const img = new Image();
        img.src = `data:${previewMime};base64,${previewBase64}`;
        await new Promise<void>((r) => { img.onload = () => r(); });
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 400 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        thumbnail = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
      }

      await savePhoto({
        userId,
        date: today,
        imageData: thumbnail,
        analysis: JSON.stringify(analysis),
        weekLabel: `Week ${weekNum}`,
        notes: notes || undefined,
      });
      setSaved(true);
      setActiveTab("history");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (photo: PhotoEntry) => {
    if (!userId) return;
    if (!confirm("Delete this check-in?")) return;
    await removePhoto({ photoId: photo._id, userId });
    if (selectedPhoto?._id === photo._id) setSelectedPhoto(null);
  };

  const openHistory = (photo: PhotoEntry) => {
    setSelectedPhoto(selectedPhoto?._id === photo._id ? null : photo);
  };

  const parsedAnalysis = (photo: PhotoEntry): BodyAnalysis | null => {
    try {
      return photo.analysis ? JSON.parse(photo.analysis) : null;
    } catch {
      return null;
    }
  };

  if (!user) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.authPrompt}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--primary)" }}>
            fitness_center
          </span>
          <h2>Sign in to use Body Scan</h2>
          <p>Track your weekly progress with AI-powered body analysis</p>
          <a href="/login" className={styles.loginBtn}>Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              <span className="material-symbols-outlined" style={{ verticalAlign: "middle", marginRight: 8, color: "var(--primary)" }}>
                body_system
              </span>
              Body Progress Analyzer
            </h1>
            <p className={styles.subtitle}>
              AI-powered weekly physique check-ins — track your transformation over 7 days
            </p>
          </div>
          <div className={styles.tabGroup}>
            <button
              className={`${styles.tab} ${activeTab === "scan" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("scan")}
              id="body-tab-scan"
            >
              <span className="material-symbols-outlined">photo_camera</span>
              New Scan
            </button>
            <button
              className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("history")}
              id="body-tab-history"
            >
              <span className="material-symbols-outlined">history</span>
              History {photos && photos.length > 0 && <span className={styles.badge}>{photos.length}</span>}
            </button>
          </div>
        </div>

        {activeTab === "scan" && (
          <div className={styles.scanGrid}>
            {/* Upload panel */}
            <div className={styles.uploadPanel}>
              <div
                className={`${styles.dropZone} ${previewUrl ? styles.dropZoneHasImage : ""}`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !previewUrl && fileRef.current?.click()}
                id="body-drop-zone"
              >
                {previewUrl ? (
                  <div className={styles.previewWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Body photo preview" className={styles.previewImg} />
                    <button
                      className={styles.changePhotoBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewUrl(null);
                        setPreviewBase64("");
                        setAnalysis(null);
                        setSaved(false);
                        fileRef.current?.click();
                      }}
                      id="body-change-photo"
                    >
                      <span className="material-symbols-outlined">photo_camera</span>
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <div className={styles.dropPlaceholder}>
                    <div className={styles.dropIcon}>
                      <span className="material-symbols-outlined">add_photo_alternate</span>
                    </div>
                    <p className={styles.dropTitle}>Upload your progress photo</p>
                    <p className={styles.dropSubtitle}>Drag & drop or tap to select • JPG, PNG, WebP</p>
                    <p className={styles.dropTip}>💡 Stand in consistent lighting for best analysis</p>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                id="body-file-input"
              />

              {/* Notes */}
              {previewUrl && (
                <div className={styles.notesSection}>
                  <label className={styles.notesLabel}>Personal notes (optional)</label>
                  <textarea
                    className={styles.notesInput}
                    placeholder="How are you feeling? Any measurements to record?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    id="body-notes"
                  />
                </div>
              )}

              {error && (
                <div className={styles.errorBanner}>
                  <span className="material-symbols-outlined">error</span>
                  {error}
                </div>
              )}

              {previewUrl && !analysis && (
                <button
                  className={styles.analyzeBtn}
                  onClick={analyzePhoto}
                  disabled={analyzing}
                  id="body-analyze-btn"
                >
                  {analyzing ? (
                    <>
                      <span className={styles.spinnerIcon}>⟳</span>
                      Analyzing with AI…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">psychology</span>
                      Analyze with AI
                    </>
                  )}
                </button>
              )}

              {analysis && !saved && (
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={saving}
                  id="body-save-btn"
                >
                  {saving ? (
                    "Saving…"
                  ) : (
                    <>
                      <span className="material-symbols-outlined">bookmark</span>
                      Save Check-in
                    </>
                  )}
                </button>
              )}

              {saved && (
                <div className={styles.savedBanner}>
                  <span className="material-symbols-outlined">check_circle</span>
                  Check-in saved to your history!
                </div>
              )}
            </div>

            {/* Analysis result */}
            <div className={styles.analysisPanel}>
              {analyzing && (
                <div className={styles.analyzeLoading}>
                  <div className={styles.pulseRing} />
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: "var(--primary)" }}>
                    psychology
                  </span>
                  <p>AI is analyzing your physique…</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    Assessing body composition, muscle definition & posture
                  </p>
                </div>
              )}

              {!analyzing && !analysis && (
                <div className={styles.analysisEmpty}>
                  <span className="material-symbols-outlined" style={{ fontSize: 56, color: "var(--border)", display: "block", marginBottom: 16 }}>
                    body_system
                  </span>
                  <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
                    Upload a photo and tap <strong style={{ color: "var(--text-secondary)" }}>Analyze with AI</strong> to get your body composition report
                  </p>
                </div>
              )}

              {analysis && <AnalysisResult analysis={analysis} />}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className={styles.historySection}>
            {!photos || photos.length === 0 ? (
              <div className={styles.emptyHistory}>
                <span className="material-symbols-outlined" style={{ fontSize: 64, color: "var(--border)" }}>
                  photo_library
                </span>
                <h3>No check-ins yet</h3>
                <p>Start your weekly tracking journey!</p>
                <button
                  className={styles.analyzeBtn}
                  style={{ marginTop: 16 }}
                  onClick={() => setActiveTab("scan")}
                >
                  <span className="material-symbols-outlined">add_photo_alternate</span>
                  Add First Check-in
                </button>
              </div>
            ) : (
              <>
                {/* Timeline strip */}
                <div className={styles.timeline}>
                  {photos.map((photo, i) => {
                    const a = parsedAnalysis(photo);
                    return (
                      <div
                        key={photo._id}
                        className={`${styles.timelineItem} ${selectedPhoto?._id === photo._id ? styles.timelineItemActive : ""}`}
                        onClick={() => openHistory(photo)}
                        id={`body-history-${i}`}
                      >
                        <div className={styles.timelinePhoto}>
                          {photo.imageData ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`data:image/jpeg;base64,${photo.imageData}`}
                              alt={photo.weekLabel ?? photo.date}
                              className={styles.thumbImg}
                            />
                          ) : (
                            <div className={styles.thumbPlaceholder}>
                              <span className="material-symbols-outlined">person</span>
                            </div>
                          )}
                          {a && (
                            <div className={styles.thumbScore} style={{
                              background: a.progressScore >= 70 ? "var(--accent-green)" : a.progressScore >= 50 ? "var(--primary)" : "var(--accent-yellow)"
                            }}>
                              {a.progressScore}
                            </div>
                          )}
                        </div>
                        <div className={styles.timelineMeta}>
                          <span className={styles.timelineWeek}>{photo.weekLabel ?? `Check-in`}</span>
                          <span className={styles.timelineDate}>
                            {new Date(photo.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected detail */}
                {selectedPhoto && (() => {
                  const a = parsedAnalysis(selectedPhoto);
                  return (
                    <div className={styles.detailCard}>
                      <div className={styles.detailHeader}>
                        <div>
                          <h2 className={styles.detailTitle}>{selectedPhoto.weekLabel ?? selectedPhoto.date}</h2>
                          <p className={styles.detailDate}>
                            {new Date(selectedPhoto.date).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                          </p>
                          {selectedPhoto.notes && (
                            <p className={styles.detailNotes}>📓 {selectedPhoto.notes}</p>
                          )}
                        </div>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(selectedPhoto)}
                          aria-label="Delete check-in"
                          id="body-delete-btn"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>

                      <div className={styles.detailGrid}>
                        {selectedPhoto.imageData && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`data:image/jpeg;base64,${selectedPhoto.imageData}`}
                            alt={selectedPhoto.weekLabel ?? "Progress photo"}
                            className={styles.detailImg}
                          />
                        )}
                        {a ? <AnalysisResult analysis={a} /> : (
                          <p style={{ color: "var(--text-muted)", padding: 24 }}>No AI analysis for this entry.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Progress trend (if 2+ photos) */}
                {photos.length >= 2 && (
                  <ProgressTrend photos={photos} parsedAnalysis={parsedAnalysis} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Analysis Result Card ── */
function AnalysisResult({ analysis }: { analysis: BodyAnalysis }) {
  const defColor = DEFINITION_COLORS[analysis.muscleDefinition] ?? "var(--text)";
  const fitIdx = FITNESS_LEVELS.indexOf(analysis.fitnessLevel);

  return (
    <div className={styles.analysisResult}>
      {/* Score + key metrics */}
      <div className={styles.resultTop}>
        <ScoreArc score={analysis.progressScore} />
        <div className={styles.metricsGrid}>
          <div className={styles.metricItem}>
            <span className={styles.metricVal}>{analysis.bodyFat}%</span>
            <span className={styles.metricLabel}>Body Fat</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricVal} style={{ color: defColor, textTransform: "capitalize" }}>
              {analysis.muscleDefinition}
            </span>
            <span className={styles.metricLabel}>Definition</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricVal} style={{ textTransform: "capitalize" }}>{analysis.posture}</span>
            <span className={styles.metricLabel}>Posture</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricVal} style={{ textTransform: "capitalize" }}>{analysis.estimatedBMICategory}</span>
            <span className={styles.metricLabel}>BMI Range</span>
          </div>
        </div>
      </div>

      {/* Fitness level bar */}
      <div className={styles.fitnessBar}>
        <span className={styles.fitnessLabel}>Fitness Level</span>
        <div className={styles.fitnessTrack}>
          {FITNESS_LEVELS.map((lvl, i) => (
            <div
              key={lvl}
              className={`${styles.fitnessSegment} ${i <= fitIdx ? styles.fitnessSegmentActive : ""}`}
              style={i <= fitIdx ? { background: fitIdx === 3 ? "var(--accent-purple)" : fitIdx === 2 ? "var(--accent-green)" : fitIdx === 1 ? "var(--primary)" : "var(--accent-yellow)" } : {}}
            />
          ))}
        </div>
        <span className={styles.fitnessValue} style={{ textTransform: "capitalize" }}>{analysis.fitnessLevel}</span>
      </div>

      {/* Weekly change */}
      {analysis.weeklyChange && (
        <div className={styles.changeChip}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>
          {analysis.weeklyChange}
        </div>
      )}

      {/* AI notes */}
      {analysis.notes && (
        <p className={styles.aiNotes}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }}>psychology</span>
          {analysis.notes}
        </p>
      )}

      {/* Muscle groups */}
      {analysis.visibleMuscleGroups.length > 0 && (
        <div className={styles.tagSection}>
          <span className={styles.tagSectionLabel}>Visible muscles</span>
          <div className={styles.tagList}>
            {analysis.visibleMuscleGroups.map((g) => (
              <span key={g} className={styles.muscleTag}>{g}</span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <div className={styles.feedbackSection}>
          <div className={styles.feedbackTitle} style={{ color: "var(--accent-green)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>thumb_up</span>
            Strengths
          </div>
          {analysis.strengths.map((s) => (
            <div key={s} className={styles.feedbackItem}>
              <span style={{ color: "var(--accent-green)" }}>✓</span> {s}
            </div>
          ))}
        </div>
      )}

      {/* Areas to improve */}
      {analysis.areasForImprovement.length > 0 && (
        <div className={styles.feedbackSection}>
          <div className={styles.feedbackTitle} style={{ color: "var(--accent-yellow)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>flag</span>
            Focus Areas
          </div>
          {analysis.areasForImprovement.map((a) => (
            <div key={a} className={styles.feedbackItem}>
              <span style={{ color: "var(--accent-yellow)" }}>→</span> {a}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className={styles.feedbackSection}>
          <div className={styles.feedbackTitle} style={{ color: "var(--primary)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>tips_and_updates</span>
            Recommendations
          </div>
          {analysis.recommendations.map((r) => (
            <div key={r} className={styles.feedbackItem}>
              <span style={{ color: "var(--primary)" }}>💡</span> {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Progress Trend ── */
function ProgressTrend({
  photos,
  parsedAnalysis,
}: {
  photos: PhotoEntry[];
  parsedAnalysis: (p: PhotoEntry) => BodyAnalysis | null;
}) {
  const scored = photos
    .map((p) => ({ ...p, a: parsedAnalysis(p) }))
    .filter((p) => p.a !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (scored.length < 2) return null;

  const maxScore = 100;
  const first = scored[0].a!;
  const last = scored[scored.length - 1].a!;
  const scoreDiff = last.progressScore - first.progressScore;
  const bfDiff = (last.bodyFat - first.bodyFat).toFixed(1);

  return (
    <div className={styles.trendCard}>
      <div className={styles.cardHeader}>
        <span className="material-symbols-outlined">trending_up</span>
        <strong>Progress Trend — {scored.length} Check-ins</strong>
      </div>

      {/* Score trend bars */}
      <div className={styles.trendBars}>
        {scored.map((p, i) => {
          const pct = ((p.a!.progressScore / maxScore) * 100);
          return (
            <div key={p._id} className={styles.trendBarWrap}>
              <div className={styles.trendBarTrack}>
                <div
                  className={styles.trendBarFill}
                  style={{ height: `${pct}%`, background: pct >= 70 ? "var(--accent-green)" : pct >= 50 ? "var(--primary)" : "var(--accent-yellow)" }}
                />
              </div>
              <span className={styles.trendBarLabel}>{p.weekLabel ?? `W${i + 1}`}</span>
              <span className={styles.trendBarScore}>{p.a!.progressScore}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.trendStats}>
        <div className={styles.trendStat}>
          <span className={styles.trendStatLabel}>Score Change</span>
          <span className={styles.trendStatVal} style={{ color: scoreDiff >= 0 ? "var(--accent-green)" : "var(--fat)" }}>
            {scoreDiff >= 0 ? "+" : ""}{scoreDiff} pts
          </span>
        </div>
        <div className={styles.trendStat}>
          <span className={styles.trendStatLabel}>Body Fat Change</span>
          <span className={styles.trendStatVal} style={{ color: Number(bfDiff) <= 0 ? "var(--accent-green)" : "var(--fat)" }}>
            {Number(bfDiff) <= 0 ? "" : "+"}{bfDiff}%
          </span>
        </div>
        <div className={styles.trendStat}>
          <span className={styles.trendStatLabel}>Check-ins</span>
          <span className={styles.trendStatVal}>{scored.length} weeks</span>
        </div>
      </div>
    </div>
  );
}
