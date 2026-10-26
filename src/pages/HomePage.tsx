import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Plus,
  Sparkles,
  Search,
  MapPin,
  ArrowUpRight,
  Leaf,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../hooks/useApp";
import { BookShelf } from "../components/BookShelf";
import { ReadingIllustration } from "../components/ReadingIllustration";
import { isDemo } from "../lib/supabase";
export function HomePage() {
  const { books, profile } = useApp();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const visible = books.filter((b) => b.availability !== "Pending");
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> YOUR NEIGHBOURHOOD BOOK CLUB
          </div>
          <h1>
            A new adventure awaits<span className="heading-dot">.</span>
          </h1>
          <p>
            Good books. Little discoveries. A whole community to share them
            with.
          </p>
        </div>
        <Link className="chapter-top" to="/chapter">
          <MapPin size={16} /> Viha’s Chapter <Chevron />
        </Link>
      </div>
      <form
        className="home-search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(`/explore?q=${encodeURIComponent(search)}`);
        }}
      >
        <Search size={19} />
        <input
          aria-label="Search for a book"
          placeholder="Find their next favourite book, author or adventure…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span>Make room for a little wonder</span>
        <button type="submit" aria-label="Search">
          <ArrowRight size={18} />
        </button>
      </form>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span>✦</span> BIG ADVENTURES START WITH A LITTLE BOOK
          </div>
          <h2>
            More stories.
            <br />
            More smiles.
            <br />
            <em>One little bookshelf.</em>
          </h2>
          <p>
            Hi {profile?.display_name.split(" ")[0] || "there"}! Their next
            favourite story is closer than you think. Borrow a book, share the
            joy.
          </p>
          <Link className="button" to="/explore">
            Find your next read <ArrowUpRight size={17} />
          </Link>
          <div className="hero-footnote">
            <span className="mini-avatars">
              <i>A</i>
              <i>R</i>
              <i>V</i>
            </span>
            <span>
              {isDemo
                ? "50 families. Countless little adventures."
                : "Your neighbourhood. A world of stories."}
              <small>
                {isDemo
                  ? "A glimpse of our founding chapter"
                  : "Grow your chapter, one story at a time"}
              </small>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <ReadingIllustration />
          <div className="hero-sticker">
            <span>READ. SHARE.</span>
            <b>Repeat the joy.</b>
            <Leaf size={15} />
          </div>
        </div>
      </section>
      <div className="quick-actions">
        <Link to="/explore">
          <span className="quick-icon mint">
            <BookOpen />
          </span>
          <div>
            <strong>Discover books</strong>
            <small>A story for every little reader</small>
          </div>
          <ArrowUpRight size={17} />
        </Link>
        <Link to="/add-book">
          <span className="quick-icon peach">
            <Plus />
          </span>
          <div>
            <strong>Share a little joy</strong>
            <small>Give your books a new adventure</small>
          </div>
          <ArrowUpRight size={17} />
        </Link>
        <Link to="/wallet">
          <span className="quick-icon yellow">
            <Sparkles />
          </span>
          <div>
            <strong>Little books, big rewards</strong>
            <small>Your BookCoin journey starts here</small>
          </div>
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <BookShelf
        title="Picked for curious minds"
        subtitle="A few stories we think your little reader will love."
        books={visible.slice(0, 6)}
      />
      <section className="chapter-strip">
        <span className="chapter-strip-icon">
          <Users size={26} />
        </span>
        <div>
          <span className="eyebrow">SMALL CHAPTER. BIG HEART.</span>
          <h3>It takes a neighbourhood to raise a reader.</h3>
          <p>Meet the families making Viha’s Chapter a little more magical.</p>
        </div>
        <Link className="button secondary" to="/chapter">
          Meet your chapter <ArrowRight size={16} />
        </Link>
      </section>
      <BookShelf
        title="Loved around the neighbourhood"
        subtitle="Well-read, well-loved, and ready for a new home."
        books={visible.slice(6, 12)}
        href="/explore?sort=shared"
      />
      <div className="age-section">
        <div className="section-heading">
          <div>
            <h2>Little readers, growing worlds</h2>
            <p>Find a story for the chapter they’re in.</p>
          </div>
          <span className="handwritten">There’s a book for everyone ↴</span>
        </div>
        <div className="age-cards">
          {[
            {
              age: "5–7",
              title: "Small books. Big wonder.",
              text: "First stories & bright imaginations",
              color: "mint",
              icon: "✿",
            },
            {
              age: "8–10",
              title: "Curiosity, meet adventure.",
              text: "New worlds & everyday heroes",
              color: "peach",
              icon: "✷",
            },
            {
              age: "11–14",
              title: "A whole world to discover.",
              text: "Brave stories & bigger questions",
              color: "lavender",
              icon: "☾",
            },
          ].map((a) => (
            <Link
              key={a.age}
              className={`age-card ${a.color}`}
              to={`/explore?age=${a.age}`}
            >
              <span className="age-tag">AGES {a.age}</span>
              <h3>{a.title}</h3>
              <p>{a.text}</p>
              <span className="age-art">{a.icon}</span>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </div>
      <BookShelf
        title="Fresh on the bookshelf"
        subtitle="New arrivals, waiting to be discovered."
        books={[...visible]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 6)}
        href="/explore?sort=new"
      />
      <section className="challenge-banner">
        <Trophy size={32} />
        <div>
          <span className="eyebrow">A LITTLE CHALLENGE FOR OUR CHAPTER</span>
          <h3>100 stories. One reading community.</h3>
          <p>
            {isDemo
              ? "Demo challenge · Imagine what we can read together."
              : "Chapter challenges are coming in the community phase."}
          </p>
        </div>
        <Link className="text-link" to="/chapter">
          Explore the chapter <ArrowRight size={17} />
        </Link>
      </section>
    </>
  );
}
function Chevron() {
  return <span className="chevron-text">⌄</span>;
}
