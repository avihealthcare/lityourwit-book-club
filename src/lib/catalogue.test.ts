import { describe, it, expect } from "vitest";
import { filterBooks, emptyFilters, isValidIsbn } from "./catalogue";
import { demoBooks } from "../data/demo";
import { MockPaymentProvider } from "../services/payments";
describe("catalogue discovery", () => {
  it("searches author and title without case sensitivity", () => {
    expect(
      filterBooks(demoBooks, { ...emptyFilters, query: "ROALD DAHL" }).map(
        (b) => b.title,
      ),
    ).toEqual(["Matilda", "The BFG"]);
  });
  it("combines age, genre, availability and language", () => {
    const results = filterBooks(demoBooks, {
      ...emptyFilters,
      age: "8–10",
      genre: "Adventure",
      language: "English",
      availability: "Available",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (b) =>
          b.age_band === "8–10" &&
          b.genre === "Adventure" &&
          b.language === "English" &&
          b.availability === "Available",
      ),
    ).toBe(true);
  });
  it("returns an empty shelf for an unknown title", () =>
    expect(
      filterBooks(demoBooks, {
        ...emptyFilters,
        query: "not-a-real-book-38201",
      }),
    ).toEqual([]));
  it.each(["9780140328721", "0-14-032872-6", "080442957X"])(
    "validates ISBN %s",
    (isbn) => expect(isValidIsbn(isbn)).toBe(true),
  );
  it.each(["9780140328722", "123", "abcdefghijklm", ""])(
    "rejects invalid ISBN %s",
    (isbn) => expect(isValidIsbn(isbn)).toBe(false),
  );
  it("does not claim to charge or issue coins in mock checkout", async () => {
    const result = await new MockPaymentProvider().createCheckout({
      coins: 25,
      price: 100,
    });
    expect(result.status).toBe("unavailable");
    expect(result.message).toContain("No payment was taken");
  });
});
