import { Search, SlidersHorizontal, X, BookOpen } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { useApp } from "../hooks/useApp";
import { filterBooks, emptyFilters } from "../lib/catalogue";
import { BookCard } from "../components/BookCard";
import type { Filters } from "../types";
import { CHAPTER_ID } from "../data/demo";
const genres = [
  "Adventure",
  "Fantasy",
  "Mystery",
  "Humour",
  "Science",
  "Classics",
  "General Knowledge",
];
export function ExplorePage() {
  const { books, saved } = useApp();
  const [params, setParams] = useSearchParams();
  const [more, setMore] = useState(false),
    [limit, setLimit] = useState(24),
    [query, setQuery] = useState(params.get("q") || "");
  const filters: Filters = {
    ...emptyFilters,
    query,
    age: params.get("age") || "All ages",
    genre: params.get("genre") || "All genres",
    language: params.get("language") || "All languages",
    availability: params.get("availability") || "Any availability",
    condition: params.get("condition") || "Any condition",
    chapter: params.get("chapter") || "All chapters",
  };
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value.startsWith("All ") || value.startsWith("Any ") || !value)
      next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
    setLimit(24);
  };
  let results = filterBooks(
    books.filter((b) => b.availability !== "Pending"),
    filters,
  );
  if (params.get("saved"))
    results = results.filter((b) => saved.includes(b.id));
  if (params.get("sort") === "shared")
    results.sort((a, b) => b.shared - a.shared);
  if (params.get("sort") === "new")
    results.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">A WORLD WAITING TO BE OPENED</div>
          <h1>Find their next favourite.</h1>
          <p>From one neighbourhood bookshelf to another.</p>
        </div>
      </div>
      <form
        className="home-search"
        onSubmit={(e) => {
          e.preventDefault();
          set("q", query);
        }}
      >
        <Search size={19} />
        <input
          aria-label="Search title, author, ISBN or keyword"
          placeholder="Search by title, author, ISBN or a little curiosity…"
          value={filters.query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(24);
          }}
        />
        {filters.query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              set("q", "");
            }}
          >
            <X size={17} />
          </button>
        )}
      </form>
      <div className="filter-row">
        <label className="sr-only" htmlFor="age-filter">
          Age group
        </label>
        <select
          id="age-filter"
          value={filters.age}
          onChange={(e) => set("age", e.target.value)}
        >
          {["All ages", "5–7", "8–10", "11–14"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="genre-filter">
          Genre
        </label>
        <select
          id="genre-filter"
          value={filters.genre}
          onChange={(e) => set("genre", e.target.value)}
        >
          {["All genres", ...genres].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="status-filter">
          Availability
        </label>
        <select
          id="status-filter"
          value={filters.availability}
          onChange={(e) => set("availability", e.target.value)}
        >
          {["Any availability", "Available", "On Loan", "Reserved"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button
          className={`filter-button ${more ? "active" : ""}`}
          onClick={() => setMore(!more)}
          aria-expanded={more}
        >
          <SlidersHorizontal size={16} /> More filters
        </button>
        <button
          className="filter-reset"
          onClick={() => {
            setParams({});
            setQuery("");
            setLimit(24);
          }}
        >
          Reset
        </button>
      </div>
      {more && (
        <div className="extra-filters">
          <label>
            Language
            <select
              value={filters.language}
              onChange={(e) => set("language", e.target.value)}
            >
              {["All languages", "English", "Hindi", "Marathi"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Condition
            <select
              value={filters.condition}
              onChange={(e) => set("condition", e.target.value)}
            >
              {["Any condition", "Like New", "Good", "Well Read"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Chapter
            <select
              value={filters.chapter}
              onChange={(e) => set("chapter", e.target.value)}
            >
              <option>All chapters</option>
              <option value={CHAPTER_ID}>Viha’s Chapter</option>
            </select>
          </label>
        </div>
      )}
      <div className="results-heading">
        <p>
          <strong>{results.length}</strong> stories to discover{" "}
          <span>in your reading neighbourhood</span>
        </p>
        <label>
          Sort by{" "}
          <select
            value={params.get("sort") || "recommended"}
            onChange={(e) => set("sort", e.target.value)}
          >
            <option value="recommended">Recommended</option>
            <option value="new">Recently added</option>
            <option value="shared">Most shared</option>
          </select>
        </label>
      </div>
      {results.length ? (
        <>
          <div className="book-grid">
            {results.slice(0, limit).map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
          {results.length > limit && (
            <button
              className="button secondary load-more"
              onClick={() => setLimit(limit + 24)}
            >
              Discover more books
            </button>
          )}
        </>
      ) : (
        <div className="empty-state">
          <BookOpen size={40} />
          <h2>No stories on this shelf yet.</h2>
          <p>Try a different search or give your filters a fresh start.</p>
          <button
            className="button secondary"
            onClick={() => {
              setParams({});
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <Link to="/add-book" className="catalogue-footer">
        Have a story that belongs here? Share a book →
      </Link>
    </>
  );
}
