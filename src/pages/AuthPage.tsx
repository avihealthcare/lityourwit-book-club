import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { ReadingIllustration } from "../components/ReadingIllustration";
import { supabase, isDemo, invitationFlow } from "../lib/supabase";
import { useApp } from "../hooks/useApp";
export function WelcomePage() {
  return (
    <div className="welcome-page">
      <header>
        <Brand />
        <Link className="text-link" to="/auth">
          Parent sign-in <ArrowRight size={17} />
        </Link>
      </header>
      <div className="welcome-layout">
        <div>
          <div className="eyebrow">A NEIGHBOURHOOD FULL OF STORIES</div>
          <h1>
            Every bookshelf
            <br />
            becomes <em>a library.</em>
          </h1>
          <p>
            Discover a world of children’s books, just around the corner. A
            little reading, a little sharing, a whole lot of possibility.
          </p>
          <Link className="button" to="/auth?mode=signup">
            Start your family’s story <ArrowRight size={18} />
          </Link>
          <Link className="welcome-demo" to={isDemo ? "/" : "/auth"}>
            {isDemo
              ? "Take a look around →"
              : "Already part of the chapter? Sign in →"}
          </Link>
          <span className="safety-note">
            <ShieldCheck size={17} /> Parent-led · Made for ages 5–14 · Local by
            heart
          </span>
        </div>
        <ReadingIllustration />
      </div>
      <footer>Read. Share. Earn. Repeat.</footer>
    </div>
  );
}
export function AuthPage() {
  const params = new URLSearchParams(location.search);
  const invited = params.get("mode") === "invite" || invitationFlow;
  const [mode, setMode] = useState(
    invited ? "update" : params.get("mode") === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const { user } = useApp();
  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && invited))
        setMode("update");
    });
    return () => subscription.unsubscribe();
  }, [invited]);
  const switchMode = (next: string) => {
    setMode(next);
    setError("");
    setSuccess("");
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!supabase) {
      setError(
        "This preview is not connected to Supabase. You can explore the demo without creating an account.",
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth`,
        });
        if (error) throw error;
        setSuccess(
          "If this email has an account, a password reset link is on its way.",
        );
      } else if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setSuccess(
          "Your password is updated. You can return to your bookshelf.",
        );
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
            emailRedirectTo: `${location.origin}/auth`,
          },
        });
        if (error) throw error;
        setSuccess(
          "Check your email to verify your parent account. Then sign in to open your chapter.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccess("Welcome back. Your bookshelf is ready.");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not complete sign-in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-art">
        <Brand />
        <div>
          <span className="eyebrow">EVERY FAMILY HAS A STORY</span>
          <h1>
            Let’s write
            <br />
            the next chapter.<em>Together.</em>
          </h1>
          <ReadingIllustration />
          <p>Every bookshelf becomes a library.</p>
        </div>
      </div>
      <main className="auth-main">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} />
          Back to the bookshelf
        </Link>
        <form className="auth-form" onSubmit={submit}>
          <span className="quick-icon mint">
            <BookOpen />
          </span>
          <h1>
            {mode === "signup"
              ? "A little hello. A big adventure."
              : mode === "reset"
                ? "Let’s start a fresh page."
                : mode === "update"
                  ? "A new password, a fresh start."
                  : "Welcome back, reader."}
          </h1>
          <p>
            {mode === "signup"
              ? "Join your neighbourhood book club with a parent account."
              : "Your family’s next favourite story is waiting."}
          </p>
          {isDemo && (
            <div className="soft-note">
              Demo preview · live sign-in requires Supabase setup.
            </div>
          )}
          {user && mode !== "update" && (
            <div className="success-note">
              You’re signed in. <Link to="/">Open your bookshelf →</Link>
            </div>
          )}
          {mode === "signup" && (
            <label>
              Parent display name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                placeholder="Your first or family name"
              />
            </label>
          )}
          {mode !== "update" && (
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Password
              <input
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
          )}
          {mode === "signup" && (
            <label className="checkbox-label">
              <input type="checkbox" required /> I’m a parent or guardian, and
              I’ll manage all book exchanges.
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="success-note">
              {success}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy
              ? "Just a moment…"
              : mode === "signup"
                ? "Create parent account"
                : mode === "reset"
                  ? "Send reset link"
                  : mode === "update"
                    ? "Update password"
                    : "Sign in"}
            {mode === "reset" ? <Mail size={17} /> : <ArrowRight size={17} />}
          </button>
          <div className="auth-links">
            {mode === "login" ? (
              <>
                <button type="button" onClick={() => switchMode("reset")}>
                  Forgot your password?
                </button>
                <span>
                  New to the chapter?{" "}
                  <button type="button" onClick={() => switchMode("signup")}>
                    Join us
                  </button>
                </span>
              </>
            ) : (
              <button type="button" onClick={() => switchMode("login")}>
                Back to sign-in
              </button>
            )}
          </div>
          <p className="safety-note">
            <ShieldCheck size={17} /> Children never sign in or exchange books
            directly.
          </p>
        </form>
      </main>
    </div>
  );
}
