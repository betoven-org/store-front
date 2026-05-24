import type { SectionBlock } from "@/lib/cms";
import Hero from "@/sections/Hero";
import Features from "@/sections/Features";
import Banner from "@/sections/Banner";
import HeroPost from "@/sections/HeroPost";
import PostGrid from "@/sections/PostGrid";
import PostCarousel from "@/sections/PostCarousel";
import PostGridWithSidebar from "@/sections/PostGridWithSidebar";
import CategoryBar from "@/sections/CategoryBar";
import ProductShowcase from "@/sections/ProductShowcase";
import WhatsAppCTA from "@/sections/WhatsAppCTA";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SECTION_MAP: Record<string, React.ComponentType<any>> = {
  Hero,
  Features,
  Banner,
  HeroPost,
  PostGrid,
  PostCarousel,
  PostList: PostCarousel,
  PostGridWithSidebar,
  CategoryBar,
  ProductShowcase,
  WhatsAppCTA,
};

export function SectionRenderer({ blocks }: { blocks: SectionBlock[] }) {
  return (
    <>
      {blocks.map((block) => {
        const Component = SECTION_MAP[block.component];
        if (!Component) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[SectionRenderer] Unknown section: "${block.component}"`,
            );
          }
          return null;
        }
        return <Component key={block.id} {...block.props} />;
      })}
    </>
  );
}
