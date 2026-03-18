"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import styles from "./Log.module.css";

/* ─── Meal type selector ─── */
const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast", icon: "☀️" },
  { id: "lunch",     label: "Lunch",     icon: "🌤️" },
  { id: "dinner",    label: "Dinner",    icon: "🌙" },
  { id: "snack",     label: "Snack",     icon: "🍎" },
];

/* ─── Recent foods list (mock) ─── */
const RECENT_FOODS = [
  { name: "Greek Yogurt",    cals: 120, protein: 17, carbs: 9, fat: 0 },
  { name: "Chicken Breast",  cals: 165, protein: 31, carbs: 0, fat: 3 },
  { name: "Brown Rice",      cals: 216, protein: 5,  carbs: 45, fat: 1 },
  { name: "Avocado (½)",     cals: 120, protein: 1,  carbs: 6,  fat: 11 },
  { name: "Protein Shake",   cals: 180, protein: 30, carbs: 12, fat: 3 },
  { name: "Banana",          cals: 89,  protein: 1,  carbs: 23, fat: 0 },
];

type ScanState = "idle" | "uploading" | "analysing" | "done";

export default function LogPage() {
  const [mealType, setMealType]   = useState("breakfast");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [preview, setPreview]     = useState<string | null>(null);
  const [query, setQuery]         = useState("");
  const fileRef                   = useRef<HTMLInputElement>(null);

  const filteredFoods = RECENT_FOODS.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setScanState("uploading");
    setTimeout(() => setScanState("analysing"), 1200);
    setTimeout(() => setScanState("done"),      2800);
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Log Your Meal</h1>
          <p className={styles.subtitle}>Snap a photo or search — AI does the rest</p>
        </div>

        {/* Meal type selector */}
        <div className={styles.mealType}>
          {MEAL_TYPES.map((m) => (
            <button
              key={m.id}
              className={`${styles.mealTypeBtn} ${mealType === m.id ? styles.mealTypeBtnActive : ""}`}
              onClick={() => setMealType(m.id)}
              id={`log-meal-${m.id}`}
            >
              <span className={styles.mealTypeEmoji}>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.mainGrid}>
          {/* Left — Camera scan */}
          <div className={styles.leftCol}>
            {/* Scan zone */}
            <div
              className={`${styles.scanZone} ${scanState !== "idle" ? styles.scanZoneActive : ""}`}
              onClick={() => scanState === "idle" && fileRef.current?.click()}
              id="log-scan-zone"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.fileInput}
                onChange={handleFile}
                id="log-file-input"
              />

              {scanState === "idle" && (
                <div className={styles.scanIdle}>
                  <div className={styles.scanIconWrap}>
                    <span className={`material-symbols-outlined ${styles.scanIcon}`}>linked_camera</span>
                    <div className={styles.scanRing} />
                  </div>
                  <h3 className={styles.scanTitle}>Snap Your Meal</h3>
                  <p className={styles.scanHint}>AI identifies every ingredient &amp; macro in under 3 seconds</p>
                  <div className={styles.scanBadge}>
                    <span className="material-symbols-outlined">bolt</span>
                    GPT-4o Vision
                  </div>
                </div>
              )}

              {preview && scanState !== "idle" && (
                <div className={styles.previewWrap}>
                  <img src={preview} alt="Meal preview" className={styles.previewImg} />
                  {scanState !== "done" && (
                    <div className={styles.scanOverlay}>
                      <div className={styles.scanBeam} />
                      <div className={styles.scanStatus}>
                        <div className={styles.spinner} />
                        <span>{scanState === "uploading" ? "Uploading…" : "Analysing with AI…"}</span>
                      </div>
                    </div>
                  )}
                  {scanState === "done" && (
                    <div className={styles.scanSuccess}>
                      <span className={`material-symbols-outlined ${styles.scanSuccessIcon}`}>check_circle</span>
                      <span>Analysis Complete!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI result card (mock) */}
            {scanState === "done" && (
              <div className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <span className="material-symbols-outlined">psychology</span>
                  <strong>AI Identified</strong>
                  <span className={styles.resultConf}>94% confident</span>
                </div>
                <h3 className={styles.resultName}>Avocado Toast with Egg</h3>
                <div className={styles.resultMacros}>
                  <div className={styles.resultMacro} style={{ color: "var(--primary)" }}>
                    <span className={styles.resultMacroVal}>412</span>
                    <span className={styles.resultMacroLbl}>Calories</span>
                  </div>
                  <div className={styles.resultMacro} style={{ color: "var(--protein)" }}>
                    <span className={styles.resultMacroVal}>18g</span>
                    <span className={styles.resultMacroLbl}>Protein</span>
                  </div>
                  <div className={styles.resultMacro} style={{ color: "var(--carbs)" }}>
                    <span className={styles.resultMacroVal}>34g</span>
                    <span className={styles.resultMacroLbl}>Carbs</span>
                  </div>
                  <div className={styles.resultMacro} style={{ color: "var(--fat)" }}>
                    <span className={styles.resultMacroVal}>22g</span>
                    <span className={styles.resultMacroLbl}>Fat</span>
                  </div>
                </div>
                <button className={styles.logBtn} id="log-confirm-btn">
                  <span className="material-symbols-outlined">add_circle</span>
                  Log This Meal
                </button>
                <button className={styles.retryBtn} onClick={() => { setPreview(null); setScanState("idle"); }}>
                  Retake Photo
                </button>
              </div>
            )}
          </div>

          {/* Right — Search / manual */}
          <div className={styles.rightCol}>
            <div className={styles.searchCard}>
              <h3 className={styles.searchTitle}>
                <span className="material-symbols-outlined">search</span>
                Search Foods
              </h3>
              <div className={styles.searchBox}>
                <span className={`material-symbols-outlined ${styles.searchBoxIcon}`}>search</span>
                <input
                  className={styles.searchInput}
                  placeholder="e.g. chicken breast, oats…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  id="log-search-input"
                />
                {query && (
                  <button className={styles.clearBtn} onClick={() => setQuery("")}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>

              {/* Food list */}
              <div className={styles.foodList}>
                {filteredFoods.map((food) => (
                  <div key={food.name} className={styles.foodItem} id={`log-food-${food.name.replace(/\s+/g, "-").toLowerCase()}`}>
                    <div className={styles.foodItemLeft}>
                      <div className={styles.foodItemDot} />
                      <div>
                        <div className={styles.foodItemName}>{food.name}</div>
                        <div className={styles.foodItemMeta}>
                          {food.cals} kcal · {food.protein}g P · {food.carbs}g C · {food.fat}g F
                        </div>
                      </div>
                    </div>
                    <button className={styles.addFoodBtn}>
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick tips */}
            <div className={styles.tipsCard}>
              <h4 className={styles.tipsTitle}>
                <span className="material-symbols-outlined">tips_and_updates</span>
                Pro Tips
              </h4>
              <ul className={styles.tipsList}>
                <li>📸 Better lighting = more accurate scan</li>
                <li>🍽️ Capture the entire plate or bowl</li>
                <li>🔍 AI reads nutrition labels too</li>
                <li>✏️ Edit macros if needed after scan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
