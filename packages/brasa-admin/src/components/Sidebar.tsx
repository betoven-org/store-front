"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Newspaper, Tag, Users, Image, Package, Layers,
  PanelBottom, Layout, Mail, Sparkles, Search, Bot,
  BarChart3, UserCog, Database, CreditCard, Code, HelpCircle,
  PanelLeftOpen, PanelLeftClose, X, ChevronDown, ChevronRight,
  ChevronsUpDown, Trash2,
} from "lucide-react";

type NavItemDef = {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

type NavGroup = {
  label: string;
  items: NavItemDef[];
};

const navGroups: NavGroup[] = [
  {
    label: "Blog",
    items: [
      { href: "/admin/posts", label: "Posts", icon: <Newspaper className="size-[15px]" /> },
      { href: "/admin/categorias", label: "Categorias", icon: <Tag className="size-[15px]" /> },
      { href: "/admin/autores", label: "Autores", icon: <Users className="size-[15px]" /> },
      { href: "/admin/midias", label: "Mídias", icon: <Image className="size-[15px]" /> },
    ],
  },
  {
    label: "Catalogo",
    items: [
      { href: "/admin/produtos", label: "Produtos", icon: <Package className="size-[15px]" /> },
      { href: "/admin/categorias-produto", label: "Categorias de Produto", icon: <Layers className="size-[15px]" /> },
    ],
  },
  {
    label: "Storefront",
    items: [
      { href: "/admin/paginas", label: "Páginas", icon: <Layout className="size-[15px]" /> },
      { href: "/admin/global-sections", label: "Sections Globais", icon: <Layers className="size-[15px]" /> },
      { href: "/admin/lixeira", label: "Lixeira", icon: <Trash2 className="size-[15px]" /> },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "/admin/identidade", label: "Identidade", icon: <Sparkles className="size-[15px]" /> },
      { href: "/admin/robots", label: "Robots", icon: <Bot className="size-[15px]" /> },
      { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="size-[15px]" /> },
      { href: "/admin/usuarios", label: "Usuários", icon: <UserCog className="size-[15px]" /> },
    ],
  },
  {
    label: "Integrações",
    items: [
      { href: "/admin/scripts", label: "Scripts & Analytics", icon: <Code className="size-[15px]" /> },
      { href: "/admin/supabase", label: "Supabase", icon: <Database className="size-[15px]" /> },
      { href: "/admin/assinatura", label: "Assinaturas", icon: <CreditCard className="size-[15px]" /> },
    ],
  },
];

function BrandLogo({ height = 24 }: { height?: number }) {
  return (
    <img
      src="/brasa-logo.png"
      alt="brasa"
      style={{ height, width: "auto", flexShrink: 0 }}
    />
  );
}

function findActiveGroup(pathname: string): string | null {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        return group.label;
      }
    }
  }
  return null;
}

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    navGroups.map((g) => g.label)
  );

  useEffect(() => {
    const active = findActiveGroup(pathname);
    if (active && !openGroups.includes(active)) {
      setOpenGroups((prev) => [...prev, active]);
    }
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden" onClick={onClose} />
      )}

      <aside
        className={[
          "fixed top-0 left-0 z-50 flex h-full flex-col transition-all duration-[160ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          "bg-sidebar border-r border-sidebar-border text-sidebar-foreground",
          collapsed ? "lg:w-16" : "lg:w-[232px]",
          "w-[232px] lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Brand */}
        <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "lg:justify-center lg:px-3 h-[52px]" : "justify-between px-3.5 h-[52px]"} px-3.5`}>
          {collapsed ? (
            <button onClick={onToggleCollapse} className="hidden lg:flex" title="Expandir">
              <BrandLogo height={22} />
            </button>
          ) : (
            <>
              <Link href="/admin" className="flex items-center gap-2">
                <BrandLogo height={26} />
              </Link>
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                title="Recolher"
              >
                <PanelLeftClose className="size-[14px]" />
              </button>
            </>
          )}
          <button onClick={onClose} className="lg:hidden rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto ${collapsed ? "lg:px-1.5 py-1" : "px-2 py-1"} px-2 py-1`}>
          {navGroups.map((group) => {
            const isOpen = openGroups.includes(group.label);
            return (
              <div key={group.label} className="mb-1">
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex w-full items-center justify-between px-2 pt-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                  >
                    <span>{group.label}</span>
                    {isOpen
                      ? <ChevronDown className="size-[11px]" />
                      : <ChevronRight className="size-[11px]" />}
                  </button>
                )}

                {(isOpen || collapsed) && group.items.map((item) => {
                  const active = pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/admin");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                      title={collapsed ? item.label : undefined}
                      className={[
                        "relative flex items-center gap-2.5 h-[30px] text-[13px] rounded-md transition-colors",
                        collapsed ? "lg:justify-center lg:px-0 px-2" : "px-2",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      ].join(" ")}
                    >
                      {/* Active indicator */}
                      {active && !collapsed && (
                        <span className="absolute -left-2 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand" />
                      )}
                      <span className={active ? "text-brand" : "text-muted-foreground"}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer: expand button when collapsed */}
        {collapsed && (
          <div className="border-t border-sidebar-border p-2 hidden lg:flex justify-center">
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-full h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title="Expandir"
            >
              <PanelLeftOpen className="size-[15px]" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
