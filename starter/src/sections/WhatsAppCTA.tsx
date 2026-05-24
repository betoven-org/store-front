import { getSettings } from "@/lib/cms";

export interface Props {
  title?: string;
  description?: string;
  buttonText?: string;
  defaultMessage?: string;
  style?: "light" | "dark" | "brand";
}

const STYLES: Record<string, { bg: string; text: string; btn: string }> = {
  light: { bg: "bg-gray-50", text: "text-gray-900", btn: "bg-green-500 hover:bg-green-600 text-white" },
  dark: { bg: "bg-gray-900", text: "text-white", btn: "bg-green-500 hover:bg-green-600 text-white" },
  brand: { bg: "bg-[#0d61ac]", text: "text-white", btn: "bg-white hover:bg-gray-100 text-[#0d61ac]" },
};

export default async function WhatsAppCTA({
  title = "Fale conosco",
  description,
  buttonText = "Chamar no WhatsApp",
  defaultMessage = "Ola! Vim pelo site.",
  style = "brand",
}: Props) {
  const settings = await getSettings();
  const phone = settings.whatsapp;

  if (!phone) return null;

  const cleanPhone = phone.replace(/\D/g, "");
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMessage)}`;
  const s = STYLES[style] ?? STYLES.brand;

  return (
    <section className={`${s.bg} py-12`}>
      <div className="mx-auto max-w-2xl px-4 text-center">
        <h2 className={`text-2xl font-bold ${s.text}`}>{title}</h2>
        {description && <p className={`mt-2 ${s.text} opacity-80`}>{description}</p>}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors ${s.btn}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.489a.75.75 0 00.922.921l4.455-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.337 0-4.508-.751-6.273-2.026l-.438-.332-3.088 1.035 1.035-3.088-.332-.438A9.953 9.953 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
          </svg>
          {buttonText}
        </a>
      </div>
    </section>
  );
}
