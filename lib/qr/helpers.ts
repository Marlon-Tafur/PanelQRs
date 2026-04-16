import { customAlphabet } from "nanoid";

// Alphabet URL-safe, sin caracteres ambiguos (0/O, 1/l/I)
const nanoid = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

export function generateSlug(): string {
  return nanoid();
}

export function buildShortUrl(slug: string): string {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  return `${baseUrl}/r/${slug}`;
}
