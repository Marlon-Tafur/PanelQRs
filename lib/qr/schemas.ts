import { z } from "zod";

export const createQrSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  description: z.string().max(500).optional(),
  destinationUrl: z
    .string()
    .url("Debe ser una URL válida")
    .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
      message: "La URL debe comenzar con http:// o https://",
    }),
});

export const updateQrSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const changeRedirectSchema = z.object({
  destinationUrl: z
    .string()
    .url("Debe ser una URL válida")
    .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
      message: "La URL debe comenzar con http:// o https://",
    }),
  changeNote: z.string().max(500).optional(),
});

const hexColorRegex = /^#(?:[0-9a-fA-F]{6})$/;

export const updateAppearanceSchema = z.object({
  primaryColor: z.string().regex(hexColorRegex, "Color primario invalido (usa formato #RRGGBB)"),
  backgroundColor: z.string().regex(hexColorRegex, "Color de fondo invalido (usa formato #RRGGBB)"),
  logoFileUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((value) => {
      if (!value) return null;
      return value;
    }),
});

export type CreateQrInput = z.infer<typeof createQrSchema>;
export type UpdateQrInput = z.infer<typeof updateQrSchema>;
export type ChangeRedirectInput = z.infer<typeof changeRedirectSchema>;
export type UpdateAppearanceInput = z.infer<typeof updateAppearanceSchema>;
