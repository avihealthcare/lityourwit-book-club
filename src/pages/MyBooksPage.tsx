import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, BookOpen, Heart, Clock, Camera, X } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { BookCard } from "../components/BookCard";
import { BookCover } from "../components/BookCover";
import { BookPhotoPicker } from "../components/BookPhotoPicker";
import { updateBookPhotos, type SelectedPhoto } from "../services/bookPhotos";
import type { Book } from "../types";
import { isDemo } from "../lib/supabase";
export function MyBooksPage() {
  const { books, profile, saved, user, refresh, notify } = useApp();
  const [editing, setEditing] = useState<Book | null>(null),
    [photos, setPhotos] = useState<SelectedPhoto[]>([]),
    [saving, setSaving] = useState(false),
    [preparing, setPreparing] = useState(false),
    [photoError, setPhotoError] = useState("");
  function editPhotos(book: Book) {
    if (isDemo) {
      notify("Sign in to the connected app to update existing book photos.");
      return;
    }
    setPhotos(
      (book.photo_paths || []).map((path, index) => ({
        id: path,
        path,
        preview: book.photo_urls?.[index] || "",
      })),
    );
    setEditing(book);
    setPhotoError("");
  }
  async function savePhotos() {
    if (!editing || !user || saving || preparing) return;
    setSaving(true);
    setPhotoError("");
    try {
      await updateBookPhotos(editing.id, photos, user.id);
      setEditing(null);
      notify("Book photographs updated.");
      await refresh();
    } catch (e) {
      setPhotoError(
        e instanceof Error
          ? e.message
          : "Could not save photographs. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    if (editing)
      document
        .querySelector(".photo-edit-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editing]);
  const [tab, setTab] = useState("My books");
  const owned = books.filter((b) => b.owner_id === profile?.id),
    visible =
      tab === "Saved for later"
        ? books.filter((b) => saved.includes(b.id))
        : owned;
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">EVERY SHELF HAS A STORY</div>
          <h1>Your little library.</h1>
          <p>The stories you love, ready for their next adventure.</p>
        </div>
        <Link className="button" to="/add-book">
          <Plus size={17} /> Share a book
        </Link>
      </div>
      <div className="tabs" role="tablist">
        {["My books", "Saved for later"].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "My books" ? <BookOpen size={17} /> : <Heart size={17} />}{" "}
            {t} <span>{t === "My books" ? owned.length : saved.length}</span>
          </button>
        ))}
      </div>
      {visible.length ? (
        tab === "Saved for later" ? (
          <div className="book-grid">
            {visible.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        ) : (
          <div className="owned-books">
            {visible.map((b) => (
              <article key={b.id} className="owned-book">
                <Link to={`/books/${b.id}`}>
                  <BookCover book={b} />
                </Link>
                <div>
                  <span className="eyebrow">
                    {b.genre} · AGES {b.age_band}
                  </span>
                  <Link to={`/books/${b.id}`}>
                    <h3>{b.title}</h3>
                  </Link>
                  <p>{b.author}</p>
                  <span
                    className={`availability ${b.availability === "Available" ? "" : "muted"}`}
                  >
                    <i />
                    {b.availability === "Pending"
                      ? "Awaiting approval"
                      : b.availability}
                  </span>
                </div>
                <div className="owned-meta">
                  <span>
                    <Heart size={14} />
                    {b.shared} times shared
                  </span>
                  <Link className="text-link" to={`/books/${b.id}`}>
                    View book →
                  </Link>
                  <button
                    className="button secondary"
                    onClick={() => editPhotos(b)}
                  >
                    <Camera size={16} /> Manage photos
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        <div className="empty-state">
          <BookOpen size={40} />
          <h2>
            {tab === "My books"
              ? "A bookshelf full of possibility."
              : "Save a little adventure for later."}
          </h2>
          <p>
            {tab === "My books"
              ? "Your first shared story starts here."
              : "Tap the heart on any book to keep it here during this session."}
          </p>
          <Link
            className="button"
            to={tab === "My books" ? "/add-book" : "/explore"}
          >
            {tab === "My books"
              ? "Share your first book"
              : "Explore the bookshelf"}
          </Link>
        </div>
      )}
      {editing && (
        <section
          className="panel photo-edit-panel"
          aria-label={`Manage photos for ${editing.title}`}
        >
          <div className="section-heading">
            <h2>Photographs of {editing.title}</h2>
            <button
              className="icon-button"
              aria-label="Close photo editor"
              disabled={saving || preparing}
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
          </div>
          <BookPhotoPicker
            photos={photos}
            onChange={setPhotos}
            disabled={saving}
            onBusyChange={setPreparing}
          />
          {photoError && (
            <p className="form-error" role="alert">
              {photoError}
            </p>
          )}
          <button
            className="button"
            disabled={saving || preparing}
            onClick={() => void savePhotos()}
          >
            {saving ? "Saving photographs…" : "Save photographs"}
          </button>
        </section>
      )}
      <div className="soft-note">
        <Clock size={19} />
        <p>
          Pending books appear on your shelf while they await approval. Eligible
          upload rewards are credited immediately.
        </p>
      </div>
    </>
  );
}
