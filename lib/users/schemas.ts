import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.email("Email invalido").max(200),
  password: z
    .string()
    .min(8, "La contrasena debe tener al menos 8 caracteres")
    .max(100),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    email: z.email().max(200).optional(),
    isActive: z.boolean().optional(),
    newPassword: z.string().min(8).max(100).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.isActive !== undefined ||
      value.newPassword !== undefined,
    { message: "Debes enviar al menos un campo para actualizar" }
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
