import type { Book } from "../types";
export function BookCover({
  book,
  large = false,
}: {
  book: Book;
  large?: boolean;
}) {
  return (
    <div
      className={`book-cover ${large ? "large" : ""}`}
      style={{ backgroundColor: book.color || "#48766a" }}
    >
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={`Cover of ${book.title}`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="cover-border" />
      <span className="cover-series">THE LITTLE BOOKSHELF COLLECTION</span>
      <strong className="cover-title">{book.title}</strong>
      <svg
        className="cover-art"
        viewBox="0 0 180 120"
        fill="none"
        aria-hidden="true"
      >
        {book.motif === "moon" ? (
          <>
            <circle cx="96" cy="48" r="31" fill="#f1dca0" />
            <circle cx="110" cy="37" r="27" fill={book.color} />
            <path
              d="m20 110 40-46 33 46 30-35 30 35"
              fill="#e4d9b4"
              opacity=".4"
            />
          </>
        ) : book.motif === "planet" ? (
          <>
            <circle cx="90" cy="60" r="34" fill="#edd69f" />
            <ellipse
              cx="90"
              cy="60"
              rx="67"
              ry="16"
              transform="rotate(-25 90 60)"
              stroke="#f9f0cc"
              strokeWidth="3"
            />
            <circle cx="33" cy="20" r="4" fill="#f9f0cc" />
          </>
        ) : book.motif === "robot" ? (
          <>
            <path
              d="M63 62 37 94M117 62l26 30M76 96l-10 21M103 96l12 21"
              stroke="#e1d7b6"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <rect x="61" y="41" width="58" height="55" rx="9" fill="#e1d7b6" />
            <rect x="69" y="12" width="42" height="32" rx="8" fill="#f5edcf" />
            <circle cx="81" cy="27" r="4" fill={book.color} />
            <circle cx="99" cy="27" r="4" fill={book.color} />
            <path d="M15 118 25 80l13 38M135 118l14-48 20 48" fill="#88a790" />
          </>
        ) : book.motif === "flower" || book.motif === "leaf" ? (
          <>
            <path
              d="M90 111V36M90 85C50 80 41 51 47 49c27 0 44 13 43 36ZM90 65c32-1 46-25 42-29-24-1-40 8-42 29Z"
              stroke="#e6dab2"
              strokeWidth="3"
              fill="#e6dab2"
              fillOpacity=".25"
            />
            {book.motif === "flower" && (
              <>
                <circle cx="90" cy="28" r="16" fill="#ead6a0" />
                <circle cx="90" cy="28" r="6" fill={book.color} />
              </>
            )}
          </>
        ) : book.motif === "key" ? (
          <>
            <circle cx="75" cy="38" r="24" stroke="#f0dca9" strokeWidth="8" />
            <path
              d="m91 56 41 43m-16-17 11-11m-1 22 11-11"
              stroke="#f0dca9"
              strokeWidth="8"
            />
          </>
        ) : book.motif === "sail" ? (
          <>
            <path d="M37 89h110l-24 22H57L37 89Z" fill="#eeddb8" />
            <path
              d="M88 15v67H44l44-67Zm7 12 40 55H95V27Z"
              fill="#eeddb8"
              opacity=".8"
            />
            <path
              d="M16 118q20-10 40 0t40 0 40 0 30 0"
              stroke="#eeddb8"
              strokeWidth="2"
            />
          </>
        ) : (
          <>
            <circle cx="90" cy="58" r="30" fill="#f3dc9d" />
            {Array.from({ length: 8 }, (_, i) => (
              <path
                key={i}
                d="M90 12v-9"
                stroke="#f3dc9d"
                strokeWidth="3"
                transform={`rotate(${i * 45} 90 58)`}
              />
            ))}
          </>
        )}
        <path
          d="m20 29 2-5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm130 16 2-5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"
          fill="#f4e4ba"
          opacity=".7"
        />
      </svg>
      <span className="cover-author">{book.author}</span>
      <span className="cover-spine" />
    </div>
  );
}
