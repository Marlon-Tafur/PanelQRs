import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { UserManagement } from "@/components/panel/UserManagement";

export default async function UsersPage() {
  const session = await getSession();
  if (!session.user) {
    redirect("/login");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <UserManagement initialUsers={users} />;
}
