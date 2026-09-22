import { HTTPException } from "hono/http-exception";
import { newId } from "./id.js";
import { supabaseAdmin } from "./supabase.js";

export const UPLOADS_BUCKET = "uploads";
// A truck's claim-request proof document (a photo of a seller's
// permit/business license — see routes/claim.ts) can contain the owner's
// real name, business address, and permit numbers, so unlike everything
// else in UPLOADS_BUCKET (cover photos, menu items — all meant to be
// public), this one lives in its own *private* bucket. Nothing gets a
// public URL; admins view it through a short-lived signed URL generated
// per-request (see getClaimDocumentUrl below).
export const CLAIM_DOCUMENTS_BUCKET = "claim-documents";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const PROOF_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
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

/**
 * Uploads a claim request's proof document (photo or PDF of a seller's
 * permit/business license — see routes/claim.ts) to the private
 * CLAIM_DOCUMENTS_BUCKET and returns its storage *path*, not a public URL —
 * there isn't one, by design (see the bucket's own comment above). Admins
 * view it via getClaimDocumentUrl below.
 */
export async function saveClaimDocument(file: File): Promise<string> {
  const ext = PROOF_EXT_BY_MIME[file.type];
  if (!ext) {
    throw new HTTPException(400, { message: "File must be a JPEG/PNG/WebP image or a PDF" });
  }
  if (file.size > MAX_BYTES) {
    throw new HTTPException(400, { message: "File must be 5MB or smaller" });
  }

  const path = `${newId()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await supabaseAdmin.storage.from(CLAIM_DOCUMENTS_BUCKET).upload(path, bytes, {
    contentType: file.type,
  });
  if (error) {
    console.error("Supabase Storage upload failed", error);
    throw new HTTPException(500, { message: "Could not upload file" });
  }
  return path;
}

/** A time-limited signed URL for an admin to view a proof document — null if signing fails. */
export async function getClaimDocumentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(CLAIM_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 600);
  if (error || !data) {
    console.error("Could not sign claim document URL", error);
    return null;
  }
  return data.signedUrl;
}

async function ensureBucket(name: string, options: { public: boolean }): Promise<void> {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    console.error("Could not list Supabase Storage buckets", listError);
    return;
  }
  if (buckets.some((b) => b.name === name)) return;

  const { error } = await supabaseAdmin.storage.createBucket(name, {
    public: options.public,
    fileSizeLimit: MAX_BYTES,
  });
  if (error) {
    console.error(`Could not create Supabase Storage bucket "${name}"`, error);
  } else {
    console.log(`Created Supabase Storage bucket "${name}"`);
  }
}

/** Idempotent bucket bootstrap, called once at server startup (see index.ts). */
export async function ensureUploadsBucket(): Promise<void> {
  await ensureBucket(UPLOADS_BUCKET, { public: true });
}

/** Idempotent bucket bootstrap, called once at server startup (see index.ts). */
export async function ensureClaimDocumentsBucket(): Promise<void> {
  await ensureBucket(CLAIM_DOCUMENTS_BUCKET, { public: false });
}
