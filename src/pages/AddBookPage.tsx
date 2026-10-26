import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Camera,
  BookOpen,
  ScanBarcode,
  Sparkles,
  ShieldCheck,
  Plus,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../hooks/useApp";
import { isDemo } from "../lib/supabase";
import { isValidIsbn } from "../lib/catalogue";
import type { NewBook } from "../types";
export function AddBookPage() {
  const { addBook, notify, user } = useApp(),
    navigate = useNavigate();
  const [method, setMethod] = useState("manual"),
    [camera, setCamera] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const [form, setForm] = useState<NewBook>({
    title: "",
    author: "",
    isbn: "",
    age_band: "8–10",
    genre: "Adventure",
    language: "English",
    condition: "Good",
    protected_value: 200,
    description: "",
    cover_url: "",
  });
  useEffect(() => {
    if (!camera) return;
    let stream: MediaStream | undefined,
      cancelled = false;
    void navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() =>
        setMessage(
          "Camera access is unavailable. Enter the ISBN below instead.",
        ),
      );
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camera]);
  const change = (key: keyof NewBook, value: string | number) =>
    setForm({ ...form, [key]: value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.author.trim()) {
      setError("Add a book title and author before sharing your story.");
      return;
    }
    if (form.isbn && !isValidIsbn(form.isbn)) {
      setError(
        "Enter a valid ISBN-10 or ISBN-13, or leave ISBN blank for a book without one.",
      );
      return;
    }
    if (!isDemo && !user) {
      setError(
        "Please sign in with your parent account before listing a book.",
      );
      return;
    }
    setSaving(true);
    try {
      await addBook({
        ...form,
        title: form.title.trim(),
        author: form.author.trim(),
      });
      navigate("/my-books");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your book could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">LET YOUR BOOKS GO ON AN ADVENTURE</div>
          <h1>A little book. A lot of joy.</h1>
          <p>
            Share a story from your shelf with a reader in your neighbourhood.
          </p>
        </div>
      </div>
      <div className="form-layout">
        <form className="panel book-form" onSubmit={submit}>
          <div className="method-tabs">
            <button
              type="button"
              className={method === "manual" ? "active" : ""}
              onClick={() => {
                setMethod("manual");
                setCamera(false);
              }}
            >
              <BookOpen size={17} /> Add manually
            </button>
            <button
              type="button"
              className={method === "isbn" ? "active" : ""}
              onClick={() => setMethod("isbn")}
            >
              <ScanBarcode size={18} /> Scan ISBN
            </button>
          </div>
          {method === "isbn" && (
            <div className="scan-panel">
              <ScanBarcode size={35} />
              <h3>Find the number behind the story.</h3>
              <p>
                Use your camera to view the barcode, then enter its ISBN below.
                Automatic recognition is planned.
              </p>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  if (!navigator.mediaDevices) {
                    setMessage(
                      "Camera requires HTTPS or localhost. You can enter the ISBN manually.",
                    );
                    return;
                  }
                  setCamera(!camera);
                }}
              >
                <Camera size={16} />
                {camera ? "Close camera" : "Open camera"}
              </button>
              {camera && (
                <video
                  ref={video}
                  autoPlay
                  playsInline
                  muted
                  aria-label="Live camera preview"
                />
              )}
              {message && <p role="status">{message}</p>}
            </div>
          )}
          <div className="cover-upload">
            <span className="upload-icon">
              <BookOpen size={30} />
            </span>
            <div>
              <h3>A cover makes a lovely first impression.</h3>
              <p>
                Add a public HTTPS cover URL, or use our original placeholder.
              </p>
            </div>
          </div>
          <label>
            Cover image URL <span>(optional)</span>
            <input
              type="url"
              placeholder="https://…"
              value={form.cover_url}
              onChange={(e) => change("cover_url", e.target.value)}
              pattern="https://.*"
            />
          </label>
          <div className="form-grid">
            <label>
              Book title{" "}
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => change("title", e.target.value)}
                placeholder="e.g. The Secret Garden"
              />
            </label>
            <label>
              Author
              <input
                required
                maxLength={150}
                value={form.author}
                onChange={(e) => change("author", e.target.value)}
                placeholder="Who wrote this adventure?"
              />
            </label>
            <label>
              ISBN <span>(if your book has one)</span>
              <input
                value={form.isbn}
                maxLength={20}
                onChange={(e) => change("isbn", e.target.value)}
                placeholder="10 or 13 digits"
              />
            </label>
            <label>
              Reading age
              <select
                value={form.age_band}
                onChange={(e) => change("age_band", e.target.value)}
              >
                {["5–7", "8–10", "11–14"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Genre
              <select
                value={form.genre}
                onChange={(e) => change("genre", e.target.value)}
              >
                {[
                  "Adventure",
                  "Fantasy",
                  "Mystery",
                  "Humour",
                  "Science",
                  "Classics",
                  "General Knowledge",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Language
              <select
                value={form.language}
                onChange={(e) => change("language", e.target.value)}
              >
                {["English", "Hindi", "Marathi", "Other"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Condition
              <select
                value={form.condition}
                onChange={(e) => change("condition", e.target.value)}
              >
                {["Like New", "Good", "Well Read"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Accepted protected value (₹)
              <input
                type="number"
                min="0"
                max="10000"
                required
                value={form.protected_value}
                onChange={(e) =>
                  change("protected_value", Number(e.target.value))
                }
              />
            </label>
          </div>
          <label>
            Tell us a little about this book
            <textarea
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What makes this story special? Add any condition notes."
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="safety-note">
            <ShieldCheck size={17} /> Listings are reviewed before appearing in
            the chapter catalogue.
          </p>
          <button disabled={saving} className="button" type="submit">
            <Plus size={18} />
            {saving ? "Submitting your story…" : "Share this book"}
          </button>
          {!isDemo && !user && (
            <Link to="/auth">Sign in to your parent account</Link>
          )}
        </form>
        <aside className="form-aside">
          <div className="panel sharing-note">
            <Sparkles size={28} />
            <h2>Stories are better shared.</h2>
            <p>
              One book on your shelf could be someone’s next favourite
              adventure.
            </p>
            <ul>
              <li>Choose books in readable, complete condition.</li>
              <li>
                Keep names and personal contact details out of photos and
                descriptions.
              </li>
              <li>Choose a fair protected value for peace of mind.</li>
            </ul>
          </div>
          <button
            className="ai-placeholder"
            onClick={() =>
              notify(
                "AI Shelf Scan is coming soon. For now, share your stories one at a time.",
              )
            }
          >
            <span>
              <Camera size={22} />
              <strong>AI Shelf Scan</strong>
            </span>
            <p>A whole bookshelf, in one little photo.</p>
            <span className="coming-soon">
              Coming soon <Sparkles size={12} />
            </span>
          </button>
        </aside>
      </div>
      {camera && (
        <button
          className="sr-only"
          type="button"
          onClick={() => setCamera(false)}
        >
          <X />
          Close camera
        </button>
      )}
    </>
  );
}
