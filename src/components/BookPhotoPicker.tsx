import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import {
  MAX_BOOK_PHOTOS,
  selectBookPhoto,
  type SelectedPhoto,
} from "../services/bookPhotos";
export function BookPhotoPicker({
  photos,
  onChange,
  disabled = false,
  onBusyChange,
}: {
  photos: SelectedPhoto[];
  onChange: (photos: SelectedPhoto[]) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const processing = useRef(false);
  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || processing.current) return;
    if (photos.length + files.length > MAX_BOOK_PHOTOS) {
      setError(
        "You can add up to six photographs. Remove one before adding more.",
      );
      return;
    }
    processing.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const selected: SelectedPhoto[] = [];
      for (const file of files) selected.push(await selectBookPhoto(file));
      onChange([...photos, ...selected]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not prepare this photo.",
      );
    } finally {
      processing.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  const blocked = busy || disabled;
  return (
    <section className="book-photo-picker" aria-label="Book photographs">
      <h3>Show the story on your shelf.</h3>
      <p>
        Add up to six photos: the cover, back and any condition details. The
        first photo appears in Explore. These photos will be uploaded with your
        listing and shared with readers who can see the book.
      </p>
      <div className="admin-actions">
        <label className={`button secondary ${blocked ? "is-disabled" : ""}`}>
          <ImagePlus size={17} /> Add photographs
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={blocked || photos.length >= MAX_BOOK_PHOTOS}
            className="sr-only"
            onChange={(e) => void choose(e)}
          />
        </label>
        <label className={`button secondary ${blocked ? "is-disabled" : ""}`}>
          <Camera size={17} /> Take a photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={blocked || photos.length >= MAX_BOOK_PHOTOS}
            className="sr-only"
            onChange={(e) => void choose(e)}
          />
        </label>
      </div>
      <p className="photo-count" role="status">
        {busy
          ? "Preparing photographs…"
          : `${photos.length} of ${MAX_BOOK_PHOTOS} photographs`}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="photo-picker-grid">
        {photos.map((photo, index) => (
          <figure key={photo.id}>
            <img
              src={photo.preview}
              alt={`Selected book photograph ${index + 1}`}
            />
            <button
              type="button"
              className="icon-button photo-remove"
              disabled={blocked}
              aria-label={`Remove photograph ${index + 1}`}
              onClick={() => onChange(photos.filter((p) => p.id !== photo.id))}
            >
              <X size={16} />
            </button>
            <figcaption>
              {index === 0 ? (
                <span>Explore cover</span>
              ) : (
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() =>
                    onChange([
                      photo,
                      ...photos.filter((p) => p.id !== photo.id),
                    ])
                  }
                >
                  Make cover
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      <small>
        JPG, PNG or WebP · resized before upload · keep personal details out of
        photos.
      </small>
    </section>
  );
}
