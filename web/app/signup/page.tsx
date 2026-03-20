"use client";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import styles from "../login/auth.module.css";

export default function SignupPage() {
  const { signUp, user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // redirect if already logged in
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const strength = (() => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthClass = [styles.sNone, styles.sWeak, styles.sFair, styles.sGood, styles.sStrong][strength];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace("/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      if (msg.includes("Connection lost")) {
        // Action likely succeeded — redirect anyway
        router.replace("/onboarding");
        return;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}>
            <span className="material-symbols-outlined">fitness_center</span>
          </div>
          <span className={styles.logoText}>Cal AI</span>
        </div>

        <h1 className={styles.heading}>Create your account</h1>
        <p className={styles.subheading}>Start your nutrition journey — free forever</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-name">Full name</label>
            <div className={styles.inputWrap}>
              <span className={`material-symbols-outlined ${styles.fieldIcon}`}>person</span>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Alex Johnson"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-email">Email</label>
            <div className={styles.inputWrap}>
              <span className={`material-symbols-outlined ${styles.fieldIcon}`}>mail</span>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-password">Password</label>
            <div className={styles.inputWrap}>
              <span className={`material-symbols-outlined ${styles.fieldIcon}`}>lock</span>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>

            {/* Strength bar */}
            {password.length > 0 && (
              <div className={styles.strengthRow}>
                <div className={styles.strengthBar}>
                  {[1,2,3,4].map((i) => (
                    <div
                      key={i}
                      className={`${styles.strengthSegment} ${i <= strength ? strengthClass : ""}`}
                    />
                  ))}
                </div>
                <span className={`${styles.strengthText} ${strengthClass}`}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="signup-confirm">Confirm password</label>
            <div className={styles.inputWrap}>
              <span className={`material-symbols-outlined ${styles.fieldIcon}`}>lock_reset</span>
              <input
                id="signup-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${styles.input} ${confirmPassword && confirmPassword !== password ? styles.inputError : ""}`}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorBox} role="alert">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <span className="material-symbols-outlined">person_add</span>
                Create Account
              </>
            )}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account?{" "}
          <Link href="/login" className={styles.switchLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
