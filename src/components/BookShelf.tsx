import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Book } from "../types";
import { BookCard } from "./BookCard";
export function BookShelf({
  title,
  subtitle,
  books,
  href = "/explore",
}: {
  title: string;
  subtitle: string;
  books: Book[];
  href?: string;
}) {
  return (
    <section className="shelf">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <Link className="text-link" to={href}>
          View all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="book-row">
        {books.slice(0, 6).map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
    </section>
  );
}
