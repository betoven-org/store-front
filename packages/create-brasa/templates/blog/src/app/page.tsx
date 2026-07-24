import { cms } from "@/lib/cms";
import type { SectionBlock } from "@/lib/cms";
import { SectionRenderer } from "@/components/SectionRenderer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const page = await cms.pages.get("home");
  const sections: SectionBlock[] = page?.sections ?? [];

  if (sections.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao Brasa</h1>
          <p className="mt-2 text-gray-500">Configure as sections no CMS para comecar.</p>
          <a href="http://localhost:3000/admin" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            Abrir CMS →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main>
      <SectionRenderer blocks={sections} />
    </main>
  );
}
