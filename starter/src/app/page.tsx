import { getPage } from "@/lib/cms";
import { SectionRenderer } from "@/components/SectionRenderer";

export default async function Home() {
  const page = await getPage("home").catch(() => null);

  if (!page?.sections || (page.sections as unknown[]).length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Configure a pagina &quot;home&quot; no CMS
        </h1>
        <p className="mt-2 text-gray-500">
          Acesse o painel admin e crie uma pagina com slug &quot;home&quot; para
          montar o layout com sections.
        </p>
      </main>
    );
  }

  return (
    <main>
      <SectionRenderer blocks={page.sections} />
    </main>
  );
}
