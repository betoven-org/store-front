"use client";

/**
 * BrasaLoader — Loading animation for the Brasa CMS.
 * Geometric blocks that assemble into a grid pattern, representing
 * sections being built. Centered on screen.
 */

export default function BrasaLoader({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5">
      <div className="relative w-[52px] h-[52px]">
        {/* 4 blocks assembling into a 2x2 grid */}
        <span className="absolute w-[22px] h-[22px] rounded-[4px] bg-foreground/80 top-0 left-0 animate-[brasa-tl_1.4s_ease-in-out_infinite]" />
        <span className="absolute w-[22px] h-[22px] rounded-[4px] bg-foreground/60 top-0 right-0 animate-[brasa-tr_1.4s_ease-in-out_infinite_0.15s]" />
        <span className="absolute w-[22px] h-[22px] rounded-[4px] bg-foreground/40 bottom-0 left-0 animate-[brasa-bl_1.4s_ease-in-out_infinite_0.3s]" />
        <span className="absolute w-[22px] h-[22px] rounded-[4px] bg-foreground/20 bottom-0 right-0 animate-[brasa-br_1.4s_ease-in-out_infinite_0.45s]" />
      </div>
      {text && (
        <p className="text-[12px] font-medium text-muted-foreground animate-pulse">{text}</p>
      )}

      <style>{`
        @keyframes brasa-tl {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.8; border-radius: 4px; }
          25% { transform: translate(6px, 6px) scale(0.6); opacity: 0.3; border-radius: 50%; }
          50% { transform: translate(15px, 15px) scale(0.4); opacity: 0.1; border-radius: 50%; }
          75% { transform: translate(6px, 6px) scale(0.7); opacity: 0.5; border-radius: 4px; }
        }
        @keyframes brasa-tr {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; border-radius: 4px; }
          25% { transform: translate(-6px, 6px) scale(0.6); opacity: 0.3; border-radius: 50%; }
          50% { transform: translate(-15px, 15px) scale(0.4); opacity: 0.1; border-radius: 50%; }
          75% { transform: translate(-6px, 6px) scale(0.7); opacity: 0.5; border-radius: 4px; }
        }
        @keyframes brasa-bl {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; border-radius: 4px; }
          25% { transform: translate(6px, -6px) scale(0.6); opacity: 0.3; border-radius: 50%; }
          50% { transform: translate(15px, -15px) scale(0.4); opacity: 0.1; border-radius: 50%; }
          75% { transform: translate(6px, -6px) scale(0.7); opacity: 0.5; border-radius: 4px; }
        }
        @keyframes brasa-br {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; border-radius: 4px; }
          25% { transform: translate(-6px, -6px) scale(0.6); opacity: 0.3; border-radius: 50%; }
          50% { transform: translate(-15px, -15px) scale(0.4); opacity: 0.1; border-radius: 50%; }
          75% { transform: translate(-6px, -6px) scale(0.7); opacity: 0.5; border-radius: 4px; }
        }
      `}</style>
    </div>
  );
}

/**
 * Full-screen centered loader — use as page loading state.
 */
export function BrasaPageLoader({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 8rem)" }}>
      <BrasaLoader text={text} />
    </div>
  );
}
