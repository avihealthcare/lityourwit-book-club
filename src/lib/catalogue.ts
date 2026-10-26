import type { Book, Filters } from "../types";
export const emptyFilters: Filters = {
  query: "",
  age: "All ages",
  genre: "All genres",
  language: "All languages",
  availability: "Any availability",
  condition: "Any condition",
  chapter: "All chapters",
};
export function filterBooks(books: Book[], f: Filters) {
  const q = f.query.trim().toLowerCase();
  return books.filter(
    (b) =>
      (!q ||
        [b.title, b.author, b.isbn, b.genre, b.description]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      (f.age === "All ages" || b.age_band === f.age) &&
      (f.genre === "All genres" || b.genre === f.genre) &&
      (f.language === "All languages" || b.language === f.language) &&
      (f.availability === "Any availability" ||
        b.availability === f.availability) &&
      (f.condition === "Any condition" || b.condition === f.condition) &&
      (f.chapter === "All chapters" || b.chapter_id === f.chapter),
  );
}
export function isValidIsbn(value: string) {
  const s = value.replace(/[\s-]/g, "");
  if (/^\d{13}$/.test(s))
    return (
      [...s].reduce((sum, n, i) => sum + Number(n) * (i % 2 ? 3 : 1), 0) %
        10 ===
      0
    );
  if (/^\d{9}[\dXx]$/.test(s))
    return (
      [...s.toUpperCase()].reduce(
        (sum, n, i) => sum + (n === "X" ? 10 : Number(n)) * (10 - i),
        0,
      ) %
        11 ===
      0
    );
  return false;
}
