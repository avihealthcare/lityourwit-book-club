import { Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { BookCover } from "./BookCover";
import { useApp } from "../hooks/useApp";
import type { Book } from "../types";
export function BookCard({ book }: { book: Book }) {
  const { saved, toggleSaved, economy } = useApp();
  return (
    <article className="book-card">
      <div className="cover-wrap">
        <Link to={`/books/${book.id}`} aria-label={`View ${book.title}`}>
          <BookCover book={book} />
        </Link>
        <button
          className={`save-book ${saved.includes(book.id) ? "saved" : ""}`}
          aria-label={`${saved.includes(book.id) ? "Unsave" : "Save"} ${book.title}`}
          aria-pressed={saved.includes(book.id)}
          onClick={() => toggleSaved(book.id)}
        >
          <Heart
            size={16}
            fill={saved.includes(book.id) ? "currentColor" : "none"}
          />
        </button>
        <span className="book-age">{book.age_band} yrs</span>
      </div>
      <div className="book-info">
        <div className="book-rating">
          <Star size={11} fill="currentColor" /> <span>{book.genre}</span>
        </div>
        <Link to={`/books/${book.id}`} className="book-title">
          {book.title}
        </Link>
        <p>{book.author}</p>
        <div className="book-meta">
          <span
            className={`availability ${book.availability !== "Available" ? "muted" : ""}`}
          >
            <i />
            {book.availability}
          </span>
          <span className="coins-small">
            <b>✦</b> {economy.borrow ?? "—"}
          </span>
        </div>
      </div>
    </article>
  );
}
