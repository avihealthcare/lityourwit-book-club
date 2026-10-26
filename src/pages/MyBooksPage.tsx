import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BookOpen, Heart, Clock } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { BookCard } from "../components/BookCard";
import { BookCover } from "../components/BookCover";
export function MyBooksPage() {
  const { books, profile, saved } = useApp();
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
      <div className="soft-note">
        <Clock size={19} />
        <p>
          Pending books appear on your shelf while they await approval. No
          listing reward is issued before moderation.
        </p>
      </div>
    </>
  );
}
