"use client";

import { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import Sidebar from "./Sidebar";
import AdminHeader from "./AdminHeader";
import { TenantProvider } from "./TenantProvider";

const STORAGE_KEY = "admin-sidebar-collapsed";

type AdminShellProps = {
  title: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
};

function ShellInner({ title, children, headerExtra }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function handleToggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div
        className={`transition-all duration-[160ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          collapsed ? "lg:pl-16" : "lg:pl-[232px]"
        }`}
      >
        <AdminHeader
          title={title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          extra={headerExtra}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminShell({ title, children, headerExtra }: AdminShellProps) {
  return (
    <SessionProvider>
      <TenantProvider>
        <ShellInner title={title} headerExtra={headerExtra}>{children}</ShellInner>
      </TenantProvider>
    </SessionProvider>
  );
}
