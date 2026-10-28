import { describe, it, expect, vi, afterEach } from "vitest";
import { extractBookDetails, findIsbn, enrichByIsbn } from "./bookScan";
afterEach(() => vi.unstubAllGlobals());
describe("book photo extraction", () => {
  it("extracts a checksum-valid ISBN from back-cover text", () => {
    expect(
      findIsbn("An adventure awaits.\nISBN 978-0-14-032872-1\n£7.99"),
    ).toBe("9780140328721");
    expect(findIsbn("ISBN 978-0-14-032872-2")).toBe("");
    expect(findIsbn("ISBN 0-8044-2957-X")).toBe("080442957X");
  });
  it("fills title, author and back-cover description and excludes publishing noise", () => {
    expect(
      extractBookDetails(
        "THE SECRET GARDEN\nby Frances Hodgson Burnett",
        "A lonely child discovers a hidden garden.\nISBN 9780140328721\nAll rights reserved",
      ),
    ).toEqual({
      title: "THE SECRET GARDEN",
      author: "Frances Hodgson Burnett",
      isbn: "9780140328721",
      description: "A lonely child discovers a hidden garden.",
    });
  });
  it("handles empty and oversized OCR text safely", () => {
    expect(extractBookDetails("", "")).toEqual({
      title: "",
      author: "",
      isbn: "",
      description: "",
    });
    expect(
      extractBookDetails("A".repeat(300), "B".repeat(3000)).description.length,
    ).toBe(2000);
  });
  it("uses matching edition metadata and a work description", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: "Matilda",
          authors: [{ key: "/authors/OL34184A" }],
          works: [{ key: "/works/OL45804W" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: "Roald Dahl" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          description: { value: "A reader with extraordinary gifts." },
        }),
      });
    vi.stubGlobal("fetch", request);
    expect(
      await enrichByIsbn({
        title: "OCR title",
        author: "OCR author",
        isbn: "9780140328721",
        description: "OCR description",
      }),
    ).toEqual({
      title: "Matilda",
      author: "Roald Dahl",
      isbn: "9780140328721",
      description: "A reader with extraordinary gifts.",
    });
    expect(
      request.mock.calls.every(([url]) =>
        String(url).startsWith("https://openlibrary.org/"),
      ),
    ).toBe(true);
  });
  it("keeps OCR details when an ISBN is missing from Open Library", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const details = {
      title: "Local story",
      author: "Local author",
      isbn: "9780140328721",
      description: "Back cover",
    };
    expect(await enrichByIsbn(details)).toEqual(details);
  });
});
