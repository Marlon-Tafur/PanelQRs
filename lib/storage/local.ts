import path from "path";

const DEFAULT_STORAGE_PATH = "./public/uploads";

export function resolveStorageRoot(): string {
  const configured = (process.env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH).trim();

  // URL-based storage is out of scope for this local adapter.
  if (/^https?:\/\//i.test(configured)) {
    return path.resolve(/*turbopackIgnore: true*/ process.cwd(), DEFAULT_STORAGE_PATH);
  }

  if (path.isAbsolute(configured)) {
    return configured;
  }

  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
}

export function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function toPublicUrl(absoluteFilePath: string): string | null {
  const publicDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "public");
  const normalizedFilePath = path.resolve(absoluteFilePath);

  if (!normalizedFilePath.startsWith(publicDir)) {
    return null;
  }

  const relative = path.relative(publicDir, normalizedFilePath);
  return `/${toPosixPath(relative)}`;
}

export function resolvePublicFilePath(publicUrl: string): string | null {
  if (!publicUrl.startsWith("/")) return null;
  if (publicUrl.includes("..")) return null;
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), "public", publicUrl.slice(1));
}
