/**
 * Exemplo de como uma section define seu schema.
 *
 * No frontend, o componente seria:
 *   sections/HeroBanner/index.tsx  (React component)
 *   sections/HeroBanner/schema.ts  (este arquivo)
 *
 * O extractor lê o `schema` exportado e gera o manifest automaticamente.
 */

import { defineSection, fields, arrayField, objectField } from "../section-schema";

export const schema = defineSection({
  key: "HeroBanner",
  title: "Hero Banner",
  description: "Banner principal com imagem de fundo, título, subtítulo e CTA",
  group: "Marketing",
  thumbnail: "/thumbs/hero-banner.png",
  props: {
    title: fields.text("Título", { required: true }),
    subtitle: fields.textarea("Subtítulo"),
    image: fields.image("Imagem de fundo", { required: true }),
    ctaText: fields.text("Texto do botão", { default: "Saiba mais" }),
    ctaHref: fields.url("Link do botão"),
    variant: fields.select("Estilo visual", ["light", "dark", "gradient"], { default: "dark" }),
    height: fields.select("Altura", ["small", "medium", "large"], { default: "medium" }),
    overlay: fields.boolean("Overlay escuro"),
    badges: arrayField(
      objectField({
        label: fields.text("Label", { required: true }),
        color: fields.color("Cor"),
      }),
      { title: "Badges", description: "Tags exibidas sobre o banner" },
    ),
  },
});
