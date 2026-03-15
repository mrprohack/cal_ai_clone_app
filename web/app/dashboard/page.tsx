"use client";
export const dynamic = "force-dynamic";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import styles from "./Dashboard.module.css";

function DoubleRing({ cals, calTarget, protein, proteinTarget }: { cals: number, calTarget: number, protein: number, proteinTarget: number }) {
  const calPct = Math.min((cals / calTarget) * 100, 100) || 0;
  const proPct = Math.min((protein / proteinTarget) * 100, 100) || 0;
  
  const outerCirc = 2 * Math.PI * 100; // r=100
  const innerCirc = 2 * Math.PI * 80;  // r=80
  
  const outerOffset = outerCirc * (1 - calPct / 100);
  const innerOffset = innerCirc * (1 - proPct / 100);

  return (
    <div className={styles.ringContainer}>
      <svg viewBox="0 0 240 240">
        {/* Outer Ring Background (Cals) */}
        <circle cx="120" cy="120" r="100" fill="none" strokeWidth="12" className={styles.ringOuterBg} />
        {/* Outer Ring Progress (Cals) */}
        <circle 
          cx="120" cy="120" r="100" fill="none" 
          strokeWidth="12" strokeLinecap="round" 
          strokeDasharray={outerCirc} strokeDashoffset={outerOffset} 
          className={styles.ringOuterCals}
        />
        {/* Inner Ring Background (Protein) */}
        <circle cx="120" cy="120" r="80" fill="none" strokeWidth="12" className={styles.ringCoreBg} />
        {/* Inner Ring Progress (Protein) */}
        <circle 
          cx="120" cy="120" r="80" fill="none" 
          strokeWidth="12" strokeLinecap="round" 
          strokeDasharray={innerCirc} strokeDashoffset={innerOffset} 
          className={styles.ringCoreProtein}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringCenterValue}>{Math.round(cals)}</span>
        <span className={styles.ringCenterLabel}>Calories</span>
      </div>
    </div>
  );
}

function MacroRow({ label, current, target, type }: { label: string, current: number, target: number, type: "green" | "primary" | "carbs" | "fat" }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  
  let fillClass = styles.fillGreen;
  let spanClass = styles.macroValue + " " + styles.green;
  if (type === "primary") { fillClass = styles.fillPrimary; spanClass = styles.macroValue + " " + styles.primary; }
  else if (type === "carbs") { fillClass = styles.fillCarbs; spanClass = styles.macroValue + " " + styles.primary; }
  else if (type === "fat") { fillClass = styles.fillFat; spanClass = styles.macroValue + " " + styles.primary; }

  return (
    <div className={styles.macroItem}>
      <span className={styles.macroLabel}>{label}</span>
      <div className={styles.macroValue}>
        {Math.round(current)}g <small>/ {target}g</small>
      </div>
      <div className={styles.track}>
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];
  const meals = useQuery(api.meals.getTodayMeals, { date: today }) ?? [];
  const summary = useQuery(api.daily.getDailySummary, { date: today });
  const user = useQuery(api.users.getMe);

  const calorieTarget = user?.dailyCalorieTarget ?? 2000;
  const proteinTarget = user?.dailyProteinTarget ?? 150;
  const consumed = summary?.totalCalories ?? 0;
  const protein = summary?.totalProtein ?? 0;
  const carbs = summary?.totalCarbs ?? 0;
  const fat = summary?.totalFat ?? 0;
  const carbsTarget = Math.round(calorieTarget * 0.45 / 4);
  const fatTarget = Math.round(calorieTarget * 0.25 / 9);

  return (
    <div className={styles.main}>
      <Navbar />
      
      <div className={styles.container}>
        {/* TOP SECTION */}
        <section className={styles.topGrid}>
          <div className={`${styles.glass} ${styles.statsCard}`}>
            <DoubleRing cals={consumed} calTarget={calorieTarget} protein={protein} proteinTarget={proteinTarget} />
            <div className={styles.macrosGrid}>
              <MacroRow label="Protein Intake" current={protein} target={proteinTarget} type="green" />
              <MacroRow label="Carbs Intake" current={carbs} target={carbsTarget} type="carbs" />
              <MacroRow label="Fat Intake" current={fat} target={fatTarget} type="fat" />
              <MacroRow label="Active Burn" current={summary?.workoutDone ? 450 : 0} target={600} type="primary" />
            </div>
          </div>
          <div className={styles.scanCard}>
            <Link href="/log" className={styles.scanBtn}>
              <span className="material-symbols-outlined scanBgIcon" style={{position:"absolute", top: "16px", right: "16px", fontSize: "64px", opacity: 0.15}}>linked_camera</span>
              <div className={styles.scanBtnIcon}>
                <span className="material-symbols-outlined">center_focus_strong</span>
              </div>
              <h3 className={styles.scanBtnTitle}>Scan Meal with AI</h3>
              <p className={styles.scanBtnSub}>Instant macro breakdown via camera</p>
            </Link>
          </div>
        </section>

        {/* TODAY'S MEALS */}
        <section>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Today's Meals</h3>
            <Link href="/log" className={styles.sectionLink}>
              View Log <span className="material-symbols-outlined" style={{fontSize: "16px"}}>arrow_forward</span>
            </Link>
          </div>
          
          <div className={styles.mealScroll}>
            {meals.map((meal: any, idx: number) => {
              const bgColors = [styles.mealTagBreakfast, styles.mealTagLunch, styles.mealTagDinner, styles.mealTagSnack];
              const tagClass = bgColors[idx % bgColors.length];
              
              // Fallback food images depending on type
              let imgUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop";
              if (meal.mealType === "lunch") imgUrl = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop";
              if (meal.mealType === "dinner") imgUrl = "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800&auto=format&fit=crop";

              return (
                <div key={meal._id} className={styles.mealCard}>
                  <img src={meal.imageUrl || imgUrl} alt={meal.mealType} className={styles.mealImg} />
                  <div className={styles.mealOverlay} />
                  <div className={styles.mealContent}>
                    <span className={`${styles.mealTag} ${tagClass}`}>{meal.mealType}</span>
                    <h4 className={styles.mealName}>{meal.foods.map((f:any)=>f.name).join(", ")}</h4>
                    <p className={styles.mealDetails}>{Math.round(meal.totalCalories)} kcal • {Math.round(meal.totalProtein)}g protein</p>
                  </div>
                </div>
              );
            })}
            
            <Link href="/log" className={styles.mealEmpty}>
              <span className={`material-symbols-outlined ${styles.mealEmptyIcon}`}>add_circle</span>
              <span className={styles.mealEmptyText}>Add Next Meal</span>
            </Link>
          </div>
        </section>

        {/* BOTTOM SECTION */}
        <section className={styles.bottomGrid}>
          {/* Progress Widget */}
          <div className={styles.progressCol}>
            <h3 className={styles.sectionTitle}>Body Progress</h3>
            <div className={`${styles.glass} ${styles.progressCard}`}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Current Weight</span>
                <span className={styles.progressValue}>{user?.weight ? user.weight + " kg" : "-- kg"}</span>
              </div>
              <div className={styles.progressPhotos}>
                <div className={styles.photoCol}>
                  <div className={styles.photoBox}>
                    {/* Placeholder image */}
                    <img src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=400&auto=format&fit=crop" className={styles.photoImg} alt="Initial" />
                    <span className={styles.photoTag}>OCT 12</span>
                  </div>
                  <span className={styles.photoSub}>Initial</span>
                </div>
                <div className={styles.photoCol}>
                  <div className={`${styles.photoBox} ${styles.photoBoxTarget}`}>
                    <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop" className={styles.photoImg} alt="Current" />
                    <span className={`${styles.photoTag} ${styles.photoTagTarget}`}>TODAY</span>
                  </div>
                  <span className={styles.photoSubTarget}>Current</span>
                </div>
              </div>
              <Link href="/progress" className={styles.updateBtn}>Update Progress</Link>
            </div>
          </div>

          {/* AI Insights & Chart */}
          <div className={styles.insightsCol}>
            <h3 className={styles.sectionTitle}>AI Insights</h3>
            
            <div className={styles.insightCards}>
              <div className={`${styles.glass} ${styles.insightCard}`}>
                <div className={styles.insightIcon}>
                  <span className="material-symbols-outlined">lightbulb</span>
                </div>
                <div>
                  <h4 className={styles.insightTitle}>Protein Optimization</h4>
                  <p className={styles.insightDesc}>
                    {protein < proteinTarget * 0.5 
                      ? "You're running low on protein today! Try adding some lean meat or a protein shake."
                      : "Great job on protein today! You're optimizing muscle recovery."}
                  </p>
                </div>
              </div>
              <div className={`${styles.glass} ${styles.insightCard} ${styles.insightCardGreen}`}>
                <div className={styles.insightIconGreen}>
                  <span className="material-symbols-outlined">trending_down</span>
                </div>
                <div>
                  <h4 className={styles.insightTitle}>Calorie Status</h4>
                  <p className={styles.insightDesc}>
                    {consumed < calorieTarget 
                      ? `You are currently ${Math.round(calorieTarget - consumed)} kcal below your target. Great for leaning out.`
                      : "You've hit your calorie target for the day! Watch out for midnight snacks."}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${styles.glass} ${styles.chartBox}`}>
              <div className={styles.chartHeader}>
                <span className={`material-symbols-outlined ${styles.chartHeaderIcon}`}>analytics</span>
                Weekly Calorie Intake Trend
              </div>
              <div className={styles.chartBars}>
                <div className={styles.bar} style={{ height: "40%" }}></div>
                <div className={styles.bar} style={{ height: "60%" }}></div>
                <div className={styles.bar} style={{ height: "80%" }}></div>
                <div className={`${styles.bar} ${styles.barActive}`} style={{ height: "95%" }}></div>
                <div className={styles.bar} style={{ height: "70%" }}></div>
                <div className={styles.bar} style={{ height: "50%" }}></div>
                <div className={styles.bar} style={{ height: "65%" }}></div>
              </div>
              <div className={styles.chartLabels}>
                <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Floating FitBot icon */}
      <Link href="/chat" className={styles.botFab}>
        <div className={styles.botFabBg} />
        <div className={styles.botFabInner}>
          <span className={`material-symbols-outlined ${styles.botIcon}`}>smart_toy</span>
          <span className={styles.botBadge} />
        </div>
        <div className={styles.botTooltip}>
          <div className={styles.botTooltipTitle}>FitBot AI</div>
          <div className={styles.botTooltipDesc}>
            "Hi {user?.name?.split(" ")[0] || "there"}! I'm here if you need any macro breakdowns or workout tips."
          </div>
          <div className={styles.botTooltipTriangle} />
        </div>
      </Link>
    </div>
  );
}
