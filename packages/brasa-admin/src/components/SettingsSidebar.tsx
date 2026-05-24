"use client";

import { useState, useRef, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type SectionKey =
  | "identidade"
  | "contato"
  | "redes"
  | "footer"
  | "newsletter"
  | "paginas"
  | "metatags"
  | "robots"
  | "supabase"
  | "assinatura";

type SettingsSidebarProps = {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
};

// ── SVG Icons ──────────────────────────────────────────────────────────────

function IconSite() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5Z" />
      <path d="M6.5 17V10.5h5V17" />
    </svg>
  );
}

function IconContent() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1.5" y="2" width="15" height="14" rx="1.5" />
      <path d="M1.5 6.5h15" />
      <path d="M7 6.5v9.5" />
    </svg>
  );
}

function IconSEO() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="1.5,13 5.5,8 8.5,11 12,5.5 16.5,2" />
      <polyline points="13.5,2 16.5,2 16.5,5" />
    </svg>
  );
}

function IconIntegrations() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.5 3.5 A3 3 0 0 1 14.5 7.5 L8 14 A2 2 0 0 1 5 11 L11.5 4.5" />
      <path d="M7 6l-4.5 4.5a2 2 0 0 0 3 3L10 9" />
      <circle cx="15" cy="15" r="1.5" />
      <line x1="13.5" y1="13.5" x2="11.5" y2="11.5" />
    </svg>
  );
}

function IconCreditCard() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1.5" y="4" width="15" height="10" rx="1.5" />
      <line x1="1.5" y1="8" x2="16.5" y2="8" />
      <line x1="4" y1="12" x2="6.5" y2="12" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 180ms ease",
        flexShrink: 0,
      }}
    >
      <polyline points="5,3 9,7 5,11" />
    </svg>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────

type SubItem = { key: SectionKey; label: string };

type Group = {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: SubItem[];
};

const groups: Group[] = [
  {
    id: "site",
    label: "Site",
    icon: <IconSite />,
    items: [
      { key: "identidade", label: "Identidade" },
      { key: "contato", label: "Contato" },
      { key: "redes", label: "Redes Sociais" },
    ],
  },
  {
    id: "conteudo",
    label: "Conteudo",
    icon: <IconContent />,
    items: [
      { key: "footer", label: "Footer" },
      { key: "newsletter", label: "Newsletter" },
      { key: "paginas", label: "Paginas" },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    icon: <IconSEO />,
    items: [
      { key: "metatags", label: "Meta Tags" },
      { key: "robots", label: "Robots" },
    ],
  },
  {
    id: "integracoes",
    label: "Integracoes",
    icon: <IconIntegrations />,
    items: [{ key: "supabase", label: "Supabase" }],
  },
];

// ── CollapsibleGroup ───────────────────────────────────────────────────────

function CollapsibleGroup({
  group,
  activeSection,
  onSectionChange,
}: {
  group: Group;
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
}) {
  const hasActive = group.items.some((i) => i.key === activeSection);
  const [open, setOpen] = useState(true);

  // Keep group open when active section is inside it
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
        aria-expanded={open}
      >
        <span className="flex-shrink-0 text-muted-foreground">{group.icon}</span>
        <span className="flex-1 text-left">{group.label}</span>
        <span className="text-muted-foreground">
          <IconChevron open={open} />
        </span>
      </button>

      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const isActive = item.key === activeSection;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onSectionChange(item.key)}
                  className={[
                    "w-full rounded-md py-1.5 px-3 pl-9 text-left text-sm transition-colors",
                    isActive
                      ? "bg-[#0d61ac]/5 text-[#0d61ac] font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-background",
                  ].join(" ")}
                  aria-current={isActive ? "true" : undefined}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── MobileDropdown ─────────────────────────────────────────────────────────

function MobileDropdown({
  activeSection,
  onSectionChange,
}: {
  activeSection: SectionKey;
  onSectionChange: (section: SectionKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const allItems: SubItem[] = [
    ...groups.flatMap((g) => g.items),
    { key: "assinatura", label: "Assinatura" },
  ];

  const activeLabel = allItems.find((i) => i.key === activeSection)?.label ?? "";

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-background transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{activeLabel}</span>
        <IconChevron open={open} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-card py-1 shadow-lg"
          role="listbox"
        >
          {groups.map((group) => (
            <div key={group.id}>
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = item.key === activeSection;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onSectionChange(item.key);
                      setOpen(false);
                    }}
                    className={[
                      "w-full px-6 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-[#0d61ac]/5 text-[#0d61ac] font-medium"
                        : "text-muted-foreground hover:bg-background hover:text-foreground",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Standalone: Assinatura */}
          <div className="mt-1 border-t border-border pt-1">
            {(() => {
              const isActive = activeSection === "assinatura";
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onSectionChange("assinatura");
                    setOpen(false);
                  }}
                  className={[
                    "w-full px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-[#0d61ac]/5 text-[#0d61ac] font-medium"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  ].join(" ")}
                >
                  Assinatura
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SettingsSidebar ────────────────────────────────────────────────────────

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:block w-52 flex-shrink-0 space-y-1">
        {groups.map((group) => (
          <CollapsibleGroup
            key={group.id}
            group={group}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
          />
        ))}

        {/* Divider */}
        <div className="pt-2">
          <div className="mb-1 border-t border-border" />
          {(() => {
            const isActive = activeSection === "assinatura";
            return (
              <button
                type="button"
                onClick={() => onSectionChange("assinatura")}
                className={[
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[#0d61ac]/5 text-[#0d61ac] font-medium"
                    : "font-medium text-foreground hover:bg-background",
                ].join(" ")}
                aria-current={isActive ? "true" : undefined}
              >
                <span className={isActive ? "text-[#0d61ac]" : "text-muted-foreground"}>
                  <IconCreditCard />
                </span>
                Assinatura
              </button>
            );
          })()}
        </div>
      </nav>

      {/* Mobile dropdown */}
      <div className="md:hidden">
        <MobileDropdown
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />
      </div>
    </>
  );
}
