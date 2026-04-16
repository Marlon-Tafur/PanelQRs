import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@panelqrs.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@panelqrs.com",
      passwordHash,
      isActive: true,
    },
  });

  console.log("Usuario creado:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
