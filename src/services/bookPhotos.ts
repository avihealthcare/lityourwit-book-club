import { supabase, isDemo } from "../lib/supabase";
import { preparePhoto } from "../lib/bookScan";
import type { Book } from "../types";
export const MAX_BOOK_PHOTOS = 6;
export interface SelectedPhoto {
  id: string;
  preview: string;
  path?: string;
  blob?: Blob;
}
export function jpegBlob(dataUrl: string) {
  const binary = atob(dataUrl.split(",")[1] || "");
  return new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], {
    type: "image/jpeg",
  });
}
export async function selectBookPhoto(file: File): Promise<SelectedPhoto> {
  const preview = await preparePhoto(file, 1600, 0.82);
  const blob = jpegBlob(preview);
  if (blob.size > 2 * 1024 * 1024)
    throw new Error(
      "Choose a smaller photo. Each prepared image must be below 2 MB.",
    );
  return { id: crypto.randomUUID(), preview, blob };
}
export async function uploadBookPhotos(
  photos: SelectedPhoto[],
  userId: string,
): Promise<string[]> {
  if (photos.length > MAX_BOOK_PHOTOS)
    throw new Error("You can add up to six photographs per book.");
  if (isDemo) return photos.map((p) => p.id);
  if (!supabase)
    throw new Error("Please sign in before uploading photographs.");
  const paths: string[] = [],
    uploaded: string[] = [];
  try {
    for (const photo of photos) {
      if (photo.path) {
        paths.push(photo.path);
        continue;
      }
      if (!photo.blob) throw new Error("Please select this photograph again.");
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("book-photos")
        .upload(path, photo.blob, {
          contentType: "image/jpeg",
          upsert: false,
          cacheControl: "3600",
        });
      if (error) throw new Error(error.message);
      uploaded.push(path);
      paths.push(path);
    }
    return paths;
  } catch (e) {
    await cleanupBookPhotos(uploaded);
    throw e;
  }
}
export async function cleanupBookPhotos(paths: string[]) {
  if (supabase && paths.length)
    await supabase.storage.from("book-photos").remove(paths);
}
export async function resolveBookPhotos(books: Book[]): Promise<Book[]> {
  if (!supabase) return books;
  const paths = [...new Set(books.flatMap((b) => b.photo_paths || []))];
  if (!paths.length) return books;
  const urls = new Map<string, string>();
  for (let i = 0; i < paths.length; i += 100) {
    const { data } = await supabase.storage
      .from("book-photos")
      .createSignedUrls(paths.slice(i, i + 100), 3600);
    for (const item of data || [])
      if (item.path && item.signedUrl && !item.error)
        urls.set(item.path, item.signedUrl);
  }
  return books.map((b) => ({
    ...b,
    photo_urls: (b.photo_paths || []).map((p) => urls.get(p) || ""),
  }));
}
export async function updateBookPhotos(
  copyId: string,
  photos: SelectedPhoto[],
  userId: string,
) {
  if (!supabase) throw new Error("Live connection required.");
  const paths = await uploadBookPhotos(photos, userId);
  try {
    const { data, error } = await supabase
      .from("book_copies")
      .update({ photo_paths: paths })
      .eq("id", copyId)
      .eq("owner_id", userId)
      .select("id")
      .single();
    if (error || !data)
      throw new Error(error?.message || "This book could not be updated.");
  } catch (e) {
    await cleanupBookPhotos(
      paths.filter((p) => !photos.some((photo) => photo.path === p)),
    );
    throw e;
  }
}
