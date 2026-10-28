import { isValidIsbn } from "./catalogue";
export interface ScanDetails {
  title: string;
  author: string;
  isbn: string;
  description: string;
}
export function findIsbn(text: string) {
  const candidates =
    text
      .toUpperCase()
      .match(/\b97[89][\d\s-]{10,22}\d\b|\b\d[\d -]{7,18}[\dX]\b/g) || [];
  for (const match of candidates) {
    const value = match.replace(/[\s-]/g, "");
    if (isValidIsbn(value)) return value;
  }
  return "";
}
export function extractBookDetails(front: string, back: string): ScanDetails {
  const lines = front
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        /[a-z]/i.test(l) &&
        l.length > 2 &&
        !/isbn|bestsell|award|illustrat|edition|publisher|publishing|www\.|https?:|\d{4,}/i.test(
          l,
        ),
    );
  const byIndex = lines.findIndex((l) =>
    /^(?:by|written by|author:)\s+/i.test(l),
  );
  const author =
    byIndex >= 0
      ? lines[byIndex].replace(/^(?:by|written by|author:)\s+/i, "")
      : lines.length > 1 && lines.at(-1)!.split(/\s+/).length <= 5
        ? lines.at(-1)!
        : "";
  const titleLines =
    byIndex >= 0
      ? lines.slice(0, byIndex)
      : author
        ? lines.slice(0, -1)
        : lines;
  const description = back
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !/isbn|^\s*[\d -]{8,}|printed in|copyright|www\.|https?:|^\s*[$₹£€]|publisher|all rights reserved/i.test(
          l,
        ),
    )
    .join(" ");
  return {
    title: titleLines.slice(0, 4).join(" ").slice(0, 200),
    author: author.slice(0, 150),
    isbn: findIsbn(`${back}\n${front}`),
    description: description.slice(0, 2000),
  };
}
interface LibraryRecord {
  title?: string;
  description?: string | { value?: string };
  authors?: { key?: string }[];
  works?: { key?: string }[];
  name?: string;
}
async function library(path: string): Promise<LibraryRecord> {
  if (!/^\/(?:isbn\/[0-9Xx]+|authors\/OL\d+A|works\/OL\d+W)\.json$/.test(path))
    return {};
  const res = await fetch(`https://openlibrary.org${path}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return {};
  return await res.json();
}
export async function enrichByIsbn(details: ScanDetails): Promise<ScanDetails> {
  if (!details.isbn) return details;
  const edition = await library(`/isbn/${details.isbn}.json`);
  if (!edition.title) return details;
  let author = details.author,
    description = details.description;
  const authorKey = edition.authors?.[0]?.key;
  if (authorKey) {
    try {
      author = (await library(`${authorKey}.json`)).name || author;
    } catch {
      /* Retain OCR when the catalogue is unavailable. */
    }
  }
  let desc = edition.description;
  if (!desc && edition.works?.[0]?.key) {
    try {
      desc = (await library(`${edition.works[0].key}.json`)).description;
    } catch {
      /* Retain the back-cover text. */
    }
  }
  if (desc)
    description = (typeof desc === "string" ? desc : desc.value) || description;
  return {
    title: edition.title.slice(0, 200),
    author: author.slice(0, 150),
    isbn: details.isbn,
    description: description.slice(0, 2000),
  };
}
export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPG, PNG or WebP photo. Convert HEIC photos to JPG first.",
    );
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 20 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.width * img.height > 50_000_000)
      throw new Error("Choose a photo with a lower resolution.");
    const scale = Math.min(1, 2200 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Photo processing is unavailable on this browser.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}
