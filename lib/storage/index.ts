import fs from "fs/promises";
import path from "path";
import { resolvePublicFilePath, resolveStorageRoot, toPublicUrl } from "@/lib/storage/local";
import { isSupabaseStorageEnabled, uploadToSupabaseStorage } from "@/lib/storage/supabase";

function inferMimeTypeFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export async function uploadBinaryFile(options: {
  objectPath: string;
  content: Buffer;
  contentType: string;
}): Promise<string> {
  if (isSupabaseStorageEnabled()) {
    return uploadToSupabaseStorage(options);
  }

  const storageRoot = resolveStorageRoot();
  const targetPath = path.join(storageRoot, options.objectPath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, options.content);

  const publicUrl = toPublicUrl(targetPath);
  if (!publicUrl) {
    throw new Error("STORAGE_OUTSIDE_PUBLIC");
  }
  return publicUrl;
}

export async function readBinaryFileByStoredUrl(storedUrl: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  if (!storedUrl) {
    throw new Error("MISSING_STORED_URL");
  }

  if (storedUrl.startsWith("/")) {
    const localPath = resolvePublicFilePath(storedUrl);
    if (!localPath) throw new Error("INVALID_LOCAL_URL");

    const buffer = await fs.readFile(localPath);
    return { buffer, mimeType: inferMimeTypeFromExtension(localPath) };
  }

  if (/^https?:\/\//i.test(storedUrl)) {
    const response = await fetch(storedUrl);
    if (!response.ok) {
      throw new Error("REMOTE_FILE_FETCH_FAILED");
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: response.headers.get("content-type") ?? inferMimeTypeFromExtension(storedUrl),
    };
  }

  throw new Error("UNSUPPORTED_STORED_URL");
}

export async function storedUrlExists(storedUrl: string | null | undefined): Promise<boolean> {
  if (!storedUrl) return false;

  if (storedUrl.startsWith("/")) {
    const localPath = resolvePublicFilePath(storedUrl);
    if (!localPath) return false;
    try {
      await fs.access(localPath);
      return true;
    } catch {
      return false;
    }
  }

  if (/^https?:\/\//i.test(storedUrl)) {
    try {
      const head = await fetch(storedUrl, { method: "HEAD" });
      if (head.ok) return true;
      const get = await fetch(storedUrl);
      return get.ok;
    } catch {
      return false;
    }
  }

  return false;
}
