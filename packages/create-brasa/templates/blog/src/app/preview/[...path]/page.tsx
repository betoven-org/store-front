import { notFound } from "next/navigation";
import Script from "next/script";
import { cms } from "@/lib/cms";
import type { SectionBlock } from "@/lib/cms";
import { LivePreviewWrapper } from "@/components/LivePreviewWrapper";

const CMS_URL = process.env.CMS_URL || "http://localhost:3000";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const slug = path.join("/");

  const page = await cms.pages.get(slug, { draft: true });
  if (!page) notFound();

  const blocks: SectionBlock[] = page.sections ?? [];

  if (blocks.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Nenhuma section no rascunho.</p>
      </div>
    );
  }

  return (
    <>
      <LivePreviewWrapper initialBlocks={blocks} />
      <Script src={`${CMS_URL}/brasa-editor.js`} strategy="afterInteractive" />
    </>
  );
}
