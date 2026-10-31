import { Modal } from "../components/Modal";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Heart,
  BookOpen,
  Repeat2,
  Check,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import { BookGallery } from "../components/BookGallery";
import { BookShelf } from "../components/BookShelf";
import { useState } from "react";
import { isDemo } from "../lib/supabase";
export function BookDetailPage() {
  const { id } = useParams();
  const { books, balance, economy, saved, toggleSaved, profile } = useApp();
  const book = books.find((x) => x.id === id);
  const [open, setOpen] = useState(false);
  if (!book)
    return (
      <div className="empty-state">
        <BookOpen size={40} />
        <h1>This book has turned a page.</h1>
        <p>It may be unavailable, or you may need to sign in.</p>
        <Link className="button" to="/explore">
          Explore books
        </Link>
      </div>
    );
  const cost = economy.borrow;
  const own = profile?.id === book.owner_id;
  return (
    <>
      <Link className="back-link" to="/explore">
        <ArrowLeft size={16} /> Back to the bookshelf
      </Link>
      <div className="detail-layout">
        <BookGallery key={book.id} book={book} />
        <div className="detail-copy">
          <div className="eyebrow">
            {book.genre} · AGES {book.age_band}
          </div>
          <h1>{book.title}</h1>
          <p className="detail-author">by {book.author}</p>
          <div className="detail-tags">
            <span>{book.language}</span>
            <span>{book.condition}</span>
            <span>
              <Repeat2 size={14} />
              {book.shared} times shared
            </span>
          </div>
          <p className="description">{book.description}</p>
          <div className="detail-availability">
            <MapPin size={24} />
            <div>
              <strong>
                {book.availability === "Available"
                  ? "A little adventure, close to home"
                  : book.availability}
              </strong>
              <p>Viha’s Chapter · Powai, Mumbai</p>
              <small>
                {
                  books.filter(
                    (b) =>
                      b.title === book.title && b.availability === "Available",
                  ).length
                }{" "}
                {book.availability === "Available"
                  ? "copies available"
                  : "available copies"}
              </small>
            </div>
          </div>
          <div className="detail-facts">
            <div>
              <small>BOOK CONDITION</small>
              <strong>{book.condition}</strong>
            </div>
            <div>
              <small>PROTECTED VALUE</small>
              <strong>₹{book.protected_value}</strong>
            </div>
          </div>
          <div className="detail-cta">
            <button
              className="button"
              disabled={
                own || book.availability !== "Available" || cost === undefined
              }
              onClick={() => setOpen(true)}
            >
              {own
                ? "On your bookshelf"
                : `Request to borrow · ${cost ?? "—"} BookCoins`}
              <ArrowRight size={17} />
            </button>
            <button
              aria-label="Save book"
              aria-pressed={saved.includes(book.id)}
              className="button secondary save-detail"
              onClick={() => toggleSaved(book.id)}
            >
              <Heart fill={saved.includes(book.id) ? "currentColor" : "none"} />
            </button>
          </div>
          <p className="wallet-hint">
            Your balance: <b>{balance} BookCoins</b>
            {cost !== undefined && balance < cost && (
              <>
                {" "}
                · <Link to="/wallet">Buy or earn more BookCoins</Link>
              </>
            )}
          </p>
          <p className="safety-note">
            <ShieldCheck size={16} /> Every exchange is coordinated between
            member accounts.
          </p>
        </div>
      </div>
      <BookShelf
        title="Keep the adventure going"
        subtitle="A few more stories from the same shelf."
        books={books.filter(
          (b) =>
            b.genre === book.genre &&
            b.id !== book.id &&
            b.availability !== "Pending",
        )}
      />
      {open && (
        <Modal titleId="borrow-title" onClose={() => setOpen(false)}>
          <BookOpen size={32} />
          <h2 id="borrow-title">A new chapter is coming.</h2>
          <p>
            {isDemo
              ? "You’re exploring the core UI preview."
              : "Book exchanges are not enabled for this chapter yet."}{" "}
            Secure requests, member approval, and OTP handover will be added in
            the next build phase.
          </p>
          <div className="soft-note">
            <Check size={18} /> No request has been sent and no BookCoins have
            been spent.
          </div>
          <button autoFocus className="button" onClick={() => setOpen(false)}>
            Keep exploring
          </button>
        </Modal>
      )}
    </>
  );
}
