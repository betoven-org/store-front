"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  id?: string;
};

export default function ToggleSwitch({ checked, onChange, size = "md", disabled, id }: Props) {
  const w = size === "sm" ? 28 : 34;
  const h = size === "sm" ? 16 : 20;
  const knob = h - 4;

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors duration-[120ms] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        width: w,
        height: h,
        background: checked ? "var(--foreground)" : "var(--border)",
      }}
    >
      <span
        className="absolute top-[2px] rounded-full bg-white shadow-sm transition-[left] duration-[140ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          width: knob,
          height: knob,
          left: checked ? w - knob - 2 : 2,
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
