import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import {
  enrichByIsbn,
  extractBookDetails,
  preparePhoto,
  type ScanDetails,
} from "../lib/bookScan";
export function BookScanner({
  onResult,
  onPhotos,
}: {
  onResult: (result: ScanDetails) => void;
  onPhotos?: (images: string[]) => Promise<void>;
}) {
  const [front, setFront] = useState(""),
    [back, setBack] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [raw, setRaw] = useState("");
  const [copying, setCopying] = useState(false);
  const cancel = useRef<AbortController | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel.current?.abort();
    };
  }, []);
  async function choose(file: File | undefined, side: "front" | "back") {
    if (!file) return;
    setError("");
    try {
      const photo = await preparePhoto(file);
      if (mounted.current) (side === "front" ? setFront : setBack)(photo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this photo.");
    }
  }
  async function scan() {
    if (!front || !back || busy) return;
    const controller = new AbortController();
    cancel.current = controller;
    setBusy(true);
    setError("");
    setStatus("Preparing the reader. The first scan may take a little longer…");
    let worker:
      | Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>
      | undefined;
    const stop = () => {
      void worker?.terminate();
    };
    controller.signal.addEventListener("abort", stop);
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr",
        langPath: "/ocr",
        workerBlobURL: false,
        logger: (m) => {
          if (
            mounted.current &&
            !controller.signal.aborted &&
            m.status === "recognizing text"
          )
            setStatus(`Reading photo… ${Math.round(m.progress * 100)}%`);
        },
      });
      if (controller.signal.aborted) return;
      const first = await worker.recognize(front);
      if (controller.signal.aborted) return;
      const second = await worker.recognize(back);
      if (controller.signal.aborted) return;
      let details = extractBookDetails(first.data.text, second.data.text);
      if (details.isbn) {
        setStatus("Matching the ISBN with Open Library…");
        try {
          details = await enrichByIsbn(details);
        } catch {
          /* Use recognized text when lookup fails. */
        }
      }
      if (controller.signal.aborted || !mounted.current) return;
      if (!details.title && !details.isbn && !details.description)
        throw new Error(
          "No readable book details found. Try brighter, sharper photos taken straight on.",
        );
      setRaw(
        `Front cover\n${first.data.text}\nBack cover\n${second.data.text}`,
      );
      onResult(details);
      setStatus(
        "Details filled below. Please review the title, author, ISBN and description before sharing. Existing entries were kept.",
      );
    } catch (e) {
      if (mounted.current && !controller.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Could not scan the photos. Try again or enter the details manually.",
        );
    } finally {
      controller.signal.removeEventListener("abort", stop);
      await worker?.terminate().catch(() => {});
      if (mounted.current) {
        setBusy(false);
        if (controller.signal.aborted) setStatus("Scan cancelled.");
      }
    }
  }
  return (
    <section
      className="scan-panel book-scanner"
      aria-label="Scan front and back covers"
    >
      <ScanLine size={30} />
      <h3>One book. Two photos. Details filled in.</h3>
      <p>
        Photograph the front cover and the back cover, including the ISBN
        number. English text is read on your device. Only the ISBN is sent to
        Open Library for a matching title and author.
      </p>
      <div className="scan-photos">
        {(["front", "back"] as const).map((side) => (
          <div key={side} className="scan-photo">
            <strong>{side === "front" ? "Front cover" : "Back cover"}</strong>
            {(side === "front" ? front : back) && (
              <img
                src={side === "front" ? front : back}
                alt={`${side} cover selected for scanning`}
              />
            )}
            <div className="admin-actions">
              <label className="button secondary">
                <Camera size={16} /> Take photo
                <input
                  disabled={busy}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    void choose(e.target.files?.[0], side);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="button secondary">
                Choose photo
                <input
                  disabled={busy}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    void choose(e.target.files?.[0], side);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="button"
        disabled={!front || !back || busy}
        onClick={() => void scan()}
      >
        <ScanLine size={17} />
        {busy ? "Reading your book…" : "Read and fill book details"}
      </button>
      {onPhotos && front && back && (
        <button
          type="button"
          className="button secondary"
          disabled={busy || copying}
          onClick={async () => {
            setCopying(true);
            setError("");
            try {
              await onPhotos([front, back]);
              setStatus(
                "Both cover photos have been added to your listing photographs below.",
              );
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not add the photographs.",
              );
            } finally {
              setCopying(false);
            }
          }}
        >
          {copying
            ? "Preparing photographs…"
            : "Use these photos in the listing"}
        </button>
      )}
      {busy && (
        <button
          type="button"
          className="button secondary"
          onClick={() => cancel.current?.abort()}
        >
          Cancel scan
        </button>
      )}
      {status && <p role="status">{status}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {raw && (
        <details>
          <summary>Review recognized text</summary>
          <pre>{raw}</pre>
        </details>
      )}
    </section>
  );
}
