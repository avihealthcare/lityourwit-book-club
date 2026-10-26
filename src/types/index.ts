export type Genre =
  | "Adventure"
  | "Fantasy"
  | "Mystery"
  | "Humour"
  | "Science"
  | "Classics"
  | "General Knowledge";
export type AgeBand = "5–7" | "8–10" | "11–14";
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  age_band: AgeBand;
  genre: Genre;
  language: string;
  description: string;
  color: string;
  motif: string;
  owner_id: string;
  chapter_id: string;
  condition: "Like New" | "Good" | "Well Read";
  availability: "Available" | "On Loan" | "Reserved" | "Pending";
  protected_value: number;
  shared: number;
  created_at: string;
  cover_url?: string;
}
export interface Plan {
  id: string;
  name: string;
  annual_price: number;
  monthly_price: number;
  signup_coins: number;
  borrow_limit: number;
  borrow_days: number;
  extension_days: number;
  child_limit: number;
  protection_limit: number;
}
export interface LedgerEntry {
  id: string;
  amount: number;
  transaction_type: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  notes: string;
}
export interface FamilyProfile {
  id: string;
  display_name: string;
  chapter_id: string;
  trust_level: string;
}
export interface Filters {
  query: string;
  age: string;
  genre: string;
  language: string;
  availability: string;
  condition: string;
  chapter: string;
}
export type NewBook = Pick<
  Book,
  | "title"
  | "author"
  | "isbn"
  | "age_band"
  | "genre"
  | "language"
  | "condition"
  | "protected_value"
  | "description"
  | "cover_url"
>;
