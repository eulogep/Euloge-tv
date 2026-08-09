import type { Metadata } from "next";
import Link from "next/link";
import "./admin.css";

export const metadata: Metadata = {
  title: "Administration en lecture seule — MJTV",
  robots: { index: false, follow: false, nocache: true },
};

const links = [
  ["/admin", "Dashboard"],
  ["/admin/channels", "Channels"],
  ["/admin/sources", "Sources"],
  ["/admin/epg", "EPG"],
  ["/admin/health", "Health"],
  ["/admin/reports", "Reports"],
] as const;

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <Link href="/admin">MJTV Admin</Link>
            <span>Lecture seule</span>
          </div>
          <nav className="admin-nav" aria-label="Navigation administration">
            {links.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
