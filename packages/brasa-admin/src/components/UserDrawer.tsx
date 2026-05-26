"use client";

import { useState, useEffect } from "react";
import Drawer from "./Drawer";
import Spinner from "./Spinner";
import FormField from "./FormField";
import { Button } from "@/components/ui/button";

type Props = {
  userId: number | null;
  onClose: () => void;
  onSaved: () => void;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador -- Acesso total ao sistema" },
  { value: "editor", label: "Editor -- Cria e edita conteudo e produtos" },
  { value: "author", label: "Autor -- Cria e edita apenas seus posts" },
  { value: "viewer", label: "Visualizador -- Apenas visualiza o painel" },
];

export default function UserDrawer({ userId, onClose, onSaved }: Props) {
  const open = userId !== null;
  const isNew = userId === -1;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName("");
    setEmail("");
    setPassword("");
    setRole("viewer");
    setErrors({});

    if (isNew) return;

    setLoading(true);
    const loadData = async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) { onClose(); return; }
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setRole(data.role || "viewer");
      } catch {
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, open, isNew, onClose]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!name.trim()) next.name = "Nome e obrigatorio";
    if (!email.trim()) next.email = "Email e obrigatorio";
    if (isNew && !password) next.password = "Senha e obrigatoria";
    if (!role) next.role = "Permissao e obrigatoria";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setErrors({});

    try {
      let res: Response;

      if (isNew) {
        res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
        });
      } else {
        const body: Record<string, string> = {
          name: name.trim(),
          email: email.trim(),
          role,
        };
        if (password) body.password = password;

        res = await fetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrors({ email: "Já existe um usuário com esse email" });
        } else {
          setErrors({ form: data.error || (isNew ? "Erro ao criar usuário" : "Erro ao atualizar usuário") });
        }
        return;
      }

      onSaved();
      onClose();
    } catch {
      setErrors({ form: "Erro de conexao. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  const title = isNew ? "Novo Usuário" : "Editar Usuário";

  return (
    <Drawer open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {errors.form && (
              <div className="mb-5 rounded-md border border-destructive/20 bg-danger-bg px-4 py-3 text-sm text-destructive">
                {errors.form}
              </div>
            )}

            <div className="space-y-5">
              <FormField
                label="Nome"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                required
                placeholder="Nome completo"
              />

              <FormField
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
                placeholder="email@exemplo.com"
              />

              <FormField
                label={isNew ? "Senha" : "Senha"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                required={isNew}
                placeholder={isNew ? "Minimo 8 caracteres" : "Deixe vazio para manter a atual"}
                description={!isNew ? "Preencha apenas para alterar a senha atual." : undefined}
              />

              <FormField
                label="Permissao"
                name="role"
                type="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                error={errors.role}
                required
                options={ROLE_OPTIONS}
                placeholder="Selecione uma permissao"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? "Salvando..." : isNew ? "Criar Usuário" : "Salvar"}
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
