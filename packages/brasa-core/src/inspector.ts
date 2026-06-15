/**
 * DOMInspector — Dev-mode section highlighter for Brasa CMS.
 * Inject this script in preview/dev mode to enable Cmd+E section inspection.
 *
 * Usage in frontend layout:
 * ```tsx
 * {process.env.NODE_ENV === "development" && (
 *   <script
 *     type="module"
 *     dangerouslySetInnerHTML={{
 *       __html: `import { initInspector } from "@brasa/core/inspector"; initInspector({ adminUrl: "${CMS_URL}" });`
 *     }}
 *   />
 * )}
 * ```
 *
 * Or as a standalone script tag:
 * ```html
 * <script>
 *   (function() {
 *     // ... paste the minified initInspector below
 *   })();
 * </script>
 * ```
 */

type InspectorOptions = {
  /** CMS admin base URL */
  adminUrl?: string;
  /** Section selector attribute (default: data-section-id) */
  sectionAttr?: string;
  /** Section type attribute (default: data-section-type) */
  typeAttr?: string;
};

export function initInspector(opts: InspectorOptions = {}) {
  if (typeof window === "undefined") return;

  const {
    adminUrl = "",
    sectionAttr = "data-section-id",
    typeAttr = "data-section-type",
  } = opts;

  let active = false;
  let overlay: HTMLDivElement | null = null;
  let tooltip: HTMLDivElement | null = null;

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.id = "brasa-inspector-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      pointerEvents: "none",
      border: "2px solid #f97316",
      borderRadius: "4px",
      backgroundColor: "rgba(249, 115, 22, 0.08)",
      zIndex: "99999",
      display: "none",
      transition: "all 0.15s ease",
    });
    document.body.appendChild(overlay);

    tooltip = document.createElement("div");
    tooltip.id = "brasa-inspector-tooltip";
    Object.assign(tooltip.style, {
      position: "fixed",
      zIndex: "100000",
      display: "none",
      backgroundColor: "#18181b",
      color: "#fafafa",
      fontSize: "11px",
      fontFamily: "ui-monospace, monospace",
      padding: "4px 8px",
      borderRadius: "4px",
      pointerEvents: "none",
      whiteSpace: "nowrap",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    });
    document.body.appendChild(tooltip);
  }

  function findSection(el: Element | null): Element | null {
    while (el) {
      if (el.hasAttribute(sectionAttr) || el.hasAttribute(typeAttr)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function onMouseMove(e: MouseEvent) {
    if (!active || !overlay || !tooltip) return;

    const target = findSection(e.target as Element);
    if (!target) {
      overlay.style.display = "none";
      tooltip.style.display = "none";
      return;
    }

    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, {
      display: "block",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });

    const sectionType = target.getAttribute(typeAttr) || target.getAttribute(sectionAttr) || "Section";
    tooltip.textContent = sectionType;
    Object.assign(tooltip.style, {
      display: "block",
      top: Math.max(0, rect.top - 24) + "px",
      left: rect.left + "px",
    });
  }

  function onClick(e: MouseEvent) {
    if (!active) return;

    const target = findSection(e.target as Element);
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    const sectionId = target.getAttribute(sectionAttr);
    if (sectionId && adminUrl) {
      // Find the page — look for data-page-id on body or a parent
      const pageEl = document.querySelector("[data-page-id]");
      const pageId = pageEl?.getAttribute("data-page-id");
      if (pageId) {
        window.open(`${adminUrl}/admin/paginas/${pageId}`, "_blank");
      }
    }
  }

  function toggle() {
    active = !active;
    if (active) {
      if (!overlay) createOverlay();
      document.body.style.cursor = "crosshair";
    } else {
      if (overlay) overlay.style.display = "none";
      if (tooltip) tooltip.style.display = "none";
      document.body.style.cursor = "";
    }
  }

  // Keyboard shortcut: Cmd+E (Mac) or Ctrl+E (Win)
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "e") {
      e.preventDefault();
      toggle();
    }
  });

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("click", onClick, true);

  // Log init
  console.log(
    "%c[Brasa Inspector]%c Cmd+E to toggle section inspector",
    "background:#f97316;color:white;padding:2px 6px;border-radius:3px;font-weight:bold",
    "color:#888"
  );
}
