import Link from "next/link";
import { LayoutDashboard, QrCode, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/qrs", label: "Mis QRs", icon: QrCode },
  { href: "/users", label: "Usuarios", icon: Users },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-lg font-semibold tracking-tight">Panel QRs</h1>
        <p className="text-sm text-muted-foreground">
          Gestión de QRs dinámicos
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              "transition-colors"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
