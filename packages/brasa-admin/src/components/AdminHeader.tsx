"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  Menu, ChevronRight, ChevronDown, LogOut, ExternalLink,
  HelpCircle, Bell, UserCog, Settings, CreditCard, Upload,
} from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import { useTenant } from "./TenantProvider";

type AdminHeaderProps = {
  title: string;
  onToggleSidebar: () => void;
  extra?: React.ReactNode;
};

const breadcrumbMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/posts": "Posts",
  "/admin/posts/novo": "Novo Post",
  "/admin/categorias": "Categorias",
  "/admin/categorias/novo": "Nova Categoria",
  "/admin/autores": "Autores",
  "/admin/autores/novo": "Novo Autor",
  "/admin/midias": "Midias",
  "/admin/paginas": "Paginas",
  "/admin/produtos": "Produtos",
  "/admin/inscritos": "Inscritos",
  "/admin/configuracoes": "Configuracoes",
  "/admin/identidade": "Identidade",
  "/admin/analytics": "Analytics",
  "/admin/usuarios": "Usuarios",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = breadcrumbMap[path];

    if (label) {
      const isLast = i === segments.length - 1;
      crumbs.push({ label, href: isLast ? undefined : path });
    } else if (i >= 2) {
      crumbs.push({ label: "Editar" });
    }
  }

  return crumbs;
}

function IconBtn({ icon: Icon, title, badge, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Icon className="size-[15px]" />
      {badge != null && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-[3px] rounded-full text-[9px] font-semibold font-mono bg-brand text-white flex items-center justify-center border-[1.5px] border-background">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function AdminHeader({ title, onToggleSidebar, extra }: AdminHeaderProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const tenant = useTenant();
  const crumbs = getBreadcrumbs(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/admin/pages/pending")
      .then((r) => r.ok ? r.json() : { docs: [] })
      .then((d) => setDraftCount(d.docs?.length ?? 0))
      .catch(() => {});
  }, [status, pathname]);

  const userName = session?.user?.name || "Usuario";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3.5 border-b border-border bg-background px-4 lg:px-[18px]">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-[480px]">
        <GlobalSearch />
      </div>

      <div className="flex-1" />

      {/* Dev environment + Changes indicator */}
      <div className="flex items-center gap-1.5">
        <DevEnvButton />
        {draftCount > 0 && (
          <Link
            href="/admin/publicar"
            className="inline-flex items-center gap-1.5 rounded-md border border-warning bg-warning-bg px-2.5 h-7 text-[11px] font-medium text-warning hover:bg-warning/10 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
            {draftCount} alterac{draftCount !== 1 ? "oes" : "ao"}
          </Link>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-0.5">
        <IconBtn
          icon={ExternalLink}
          title="Ver site publico"
          onClick={() => {
            if (tenant?.frontendUrl) {
              window.open(tenant.frontendUrl, "_blank");
            }
          }}
        />
        <IconBtn icon={HelpCircle} title="Ajuda" onClick={() => window.location.href = "/admin/ajuda"} />
        <IconBtn icon={Bell} title="Notificacoes" badge={3} />
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border self-center" />

      {/* Account */}
      {mounted && status === "authenticated" && session?.user && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            className={[
              "flex items-center gap-2 px-2 py-1 h-9 rounded-md transition-colors",
              menuOpen ? "bg-accent" : "hover:bg-accent",
            ].join(" ")}
          >
            <span
              className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold shrink-0"
              style={{
                background: `oklch(0.90 0.04 ${userName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 260 + 20})`,
                color: `oklch(0.40 0.10 ${userName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 260 + 20})`,
              }}
            >
              {initials}
            </span>
            <span className="text-[12.5px] font-medium hidden sm:block">{userName.split(" ")[0]}</span>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-[240px] bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-120 z-50">
              <div className="px-3.5 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-semibold shrink-0"
                    style={{
                      background: `oklch(0.90 0.04 ${userName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 260 + 20})`,
                      color: `oklch(0.40 0.10 ${userName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 260 + 20})`,
                    }}
                  >
                    {initials}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-medium text-foreground">{userName}</span>
                    <span className="text-[11px] font-mono text-muted-foreground truncate">{userEmail}</span>
                  </div>
                </div>
              </div>
              <div className="p-1">
                <MenuButton icon={LogOut} label="Sair" danger onClick={() => signOut({ callbackUrl: "/admin/login" })} />
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function DevEnvButton() {
  const [open, setOpen] = useState(false);
  const [envs, setEnvs] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    if (!envs) {
      fetch("/api/admin/dev-envs")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.envs) setEnvs(data.envs); })
        .catch(() => {});
    }
  }

  function handleCopy() {
    if (!envs) return;
    navigator.clipboard.writeText(envs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 h-7 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        dev
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[380px] bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-120 z-50">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h4 className="text-[13px] font-semibold text-foreground">Ambiente de Desenvolvimento</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cole no <code className="bg-accent px-1 rounded">.env</code> do frontend</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!envs}
              className="inline-flex items-center gap-1 rounded-md bg-foreground text-background text-[11px] font-medium h-7 px-2.5 hover:brightness-[0.97] disabled:opacity-40 transition-all"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <div className="p-3 max-h-[280px] overflow-y-auto">
            {envs ? (
              <pre className="text-[10.5px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed select-all">{envs}</pre>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center py-4">Carregando...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({ icon: Icon, label, danger, onClick, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const classes = [
    "flex w-full items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors text-left",
    danger ? "text-destructive hover:bg-destructive/5" : "text-foreground hover:bg-accent",
  ].join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        <Icon className={`size-[14px] ${danger ? "text-destructive" : "text-muted-foreground"}`} />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      <Icon className={`size-[14px] ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      {label}
    </button>
  );
}
