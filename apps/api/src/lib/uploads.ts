import { HTTPException } from "hono/http-exception";
import { newId } from "./id.js";
import { supabaseAdmin } from "./supabase.js";

export const UPLOADS_BUCKET = "uploads";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Uploads an image to the `uploads` Supabase Storage bucket, under
 * <subdir>/, and returns its public URL directly — since it's already an
 * absolute https:// URL, resolveUploadUrl() on both clients passes it
 * through unchanged (see its own comment). Storage replaces what used to be
 * local-disk writes under apps/api/data/uploads/ — see ensureUploadsBucket,
 * called once at server startup, for how the bucket itself gets created.
 */
export async function saveImageUpload(file: File, subdir: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new HTTPException(400, { message: "File must be an image" });
  }
  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    throw new HTTPException(400, { message: "Unsupported image type" });
  }
  if (file.size > MAX_BYTES) {
    throw new HTTPException(400, { message: "Image must be 5MB or smaller" });
  }

  const path = `${subdir}/${newId()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage.from(UPLOADS_BUCKET).upload(path, bytes, {
    contentType: file.type,
  });
  if (error) {
    console.error("Supabase Storage upload failed", error);
    throw new HTTPException(500, { message: "Could not upload image" });
  }

  const { data } = supabaseAdmin.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Idempotent bucket bootstrap, called once at server startup (see index.ts). */
export async function ensureUploadsBucket(): Promise<void> {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    console.error("Could not list Supabase Storage buckets", listError);
    return;
  }
  if (buckets.some((b) => b.name === UPLOADS_BUCKET)) return;

  const { error } = await supabaseAdmin.storage.createBucket(UPLOADS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
  });
  if (error) {
    console.error("Could not create Supabase Storage bucket", error);
  } else {
    console.log(`Created Supabase Storage bucket "${UPLOADS_BUCKET}"`);
  }
}
