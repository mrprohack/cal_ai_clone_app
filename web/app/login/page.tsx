"use client";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import styles from "./auth.module.css";

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // redirect if already logged in
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      // Only navigate AFTER the action fully resolves
      router.replace("/dashboard");
    } catch (err: unknown) {
      // Ignore "Connection lost" errors caused by unmount/navigation race
      const msg = err instanceof Error ? err.message : "Sign in failed";
      if (msg.includes("Connection lost")) {
        // Action likely succeeded — redirect anyway
        router.replace("/dashboard");
        return;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@calai.app");
    setPassword("Demo1234!");
  };

  return (
    <div className={styles.page}>
      {/* Background blobs */}
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

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>Sign in to track your nutrition &amp; fitness</p>

        {/* Demo Banner */}
        <button type="button" className={styles.demoBanner} onClick={fillDemo}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>bolt</span>
          <span>Try demo account — click to autofill</span>
          <code>demo@calai.app / Demo1234!</code>
        </button>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">Email</label>
            <div className={styles.inputWrap}>
              <span className={`material-symbols-outlined ${styles.fieldIcon}`}>mail</span>
              <input
                id="login-email"
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
            <label className={styles.label} htmlFor="login-password">Password</label>
            <div className={styles.inputWrap}>
              <span className={`material-symbols-outlined ${styles.fieldIcon}`}>lock</span>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
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
                <span className="material-symbols-outlined">login</span>
                Sign In
              </>
            )}
          </button>
        </form>

        <p className={styles.switchText}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className={styles.switchLink}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
