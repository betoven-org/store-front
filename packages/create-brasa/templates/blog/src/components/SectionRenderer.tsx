import type { SectionBlock } from "@/lib/cms";

// Import your sections here
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import CTA from "@/components/sections/CTA";

// Map section keys to components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_MAP: Record<string, React.ComponentType<any>> = {
  Hero,
  Features,
  CTA,
};

export function SectionRenderer({ blocks }: { blocks: SectionBlock[] }) {
  return (
    <>
      {blocks.filter((b) => !b.hidden).map((block) => {
        const Component = SECTION_MAP[block.component];
        if (!Component) return null;

        return (
          <section key={block.id} data-section-id={block.id} data-section-type={block.component}>
            <Component {...block.props} loaderData={block.loaderData} />
          </section>
        );
      })}
    </>
  );
}
