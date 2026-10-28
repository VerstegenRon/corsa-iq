// Receipt uploads run in the browser, straight to storage, so large photos never pass through a Server Action.

import { RECEIPT_BUCKET, RECEIPT_MAX_BYTES } from "@/lib/receipts";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGE_SIDE = 2000;

/** Phone photos are often 5+ MB; a 2000 px JPEG is still readable and ten times smaller. */
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // Formats the browser cannot decode (e.g. HEIC outside Safari) are uploaded as they are.
    return file;
  }
}

export async function uploadReceipt(garageId: string, file: File): Promise<{ path: string } | { error: string }> {
  const body = await shrinkImage(file);
  if (body.size > RECEIPT_MAX_BYTES) return { error: "Het bonnetje is groter dan 10 MB." };

  const subtype = body.type.split("/")[1] || "jpg";
  const path = `${garageId}/${crypto.randomUUID()}.${subtype === "jpeg" ? "jpg" : subtype}`;
  const { error } = await createClient().storage.from(RECEIPT_BUCKET).upload(path, body, { contentType: body.type });
  if (error) return { error: `Bonnetje uploaden mislukt: ${error.message}` };
  return { path };
}

export async function removeReceipt(path: string) {
  await createClient().storage.from(RECEIPT_BUCKET).remove([path]);
}
