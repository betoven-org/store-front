"use client";

export default function BeforeLogin() {
  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: "24px",
        padding: "16px 24px",
        background: "rgba(13, 97, 172, 0.08)",
        borderRadius: "8px",
        border: "1px solid rgba(13, 97, 172, 0.15)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "14px",
          color: "#6b7280",
          lineHeight: "1.5",
        }}
      >
        Painel administrativo{" "}
        <strong style={{ color: "var(--primary)" }}>Brasa CMS</strong>.
        <br />
        Acesse com suas credenciais para gerenciar o conteudo.
      </p>
    </div>
  );
}
