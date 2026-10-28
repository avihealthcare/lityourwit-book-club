import { useState } from "react";
import type { Book } from "../types";
import { BookCover } from "./BookCover";
export function BookGallery({ book }: { book: Book }) {
  const photos = (book.photo_urls || []).filter(Boolean);
  const [selected, setSelected] = useState(0),
    [failed, setFailed] = useState<string[]>([]);
  const current = photos[Math.min(selected, Math.max(0, photos.length - 1))];
  return (
    <div className="detail-cover-panel book-gallery">
      {current && !failed.includes(current) ? (
        <a
          className="gallery-main"
          href={current}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={current}
            alt={`${book.title}, photograph ${selected + 1}`}
            onError={() => setFailed((prev) => [...prev, current])}
          />
          <span>Open full photograph</span>
        </a>
      ) : (
        <BookCover book={book} large />
      )}
      {photos.length > 0 ? (
        <>
          <div className="gallery-thumbs" aria-label="Book photographs">
            {photos.map((url, index) => (
              <button
                key={url}
                type="button"
                aria-label={`View photograph ${index + 1} of ${book.title}`}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              >
                <img
                  src={url}
                  alt={`Book photograph ${index + 1}`}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
          <span>
            Photographs supplied by the book owner · {photos.length}{" "}
            {photos.length === 1 ? "photo" : "photos"}
          </span>
        </>
      ) : (
        <span>
          {book.cover_url
            ? "Book cover"
            : "Original placeholder cover · actual cover may differ"}
        </span>
      )}
    </div>
  );
}
