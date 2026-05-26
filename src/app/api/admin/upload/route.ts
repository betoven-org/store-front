import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { media } from "@brasa/core/schema";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { encode } from "blurhash";
import { getTenantId } from "@/lib/tenant";

interface ProcessedImage {
  suffix: string;
  width: number;
  height: number;
}

const SIZES: ProcessedImage[] = [
  { suffix: "thumbnail", width: 400, height: 300 },
  { suffix: "card", width: 768, height: 432 },
  { suffix: "hero", width: 1920, height: 800 },
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Apenas imagens sao permitidas" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const alt = (formData.get("alt") as string) || baseName;

    // Upload original
    const originalBlob = await put(`media/${file.name}`, buffer, {
      access: "public",
      addRandomSuffix: true,
    });

    let thumbnailUrl: string | null = null;
    let cardUrl: string | null = null;
    let heroUrl: string | null = null;

    // Generate resized versions
    try {
      const results = await Promise.all(
        SIZES.map(async ({ suffix, width, height }) => {
          const resized = await sharp(buffer)
            .resize(width, height, { fit: "cover" })
            .webp({ quality: 80 })
            .toBuffer();

          const blob = await put(
            `media/${baseName}-${suffix}.webp`,
            resized,
            { access: "public", addRandomSuffix: true },
          );

          return { suffix, url: blob.url };
        }),
      );

      for (const { suffix, url } of results) {
        if (suffix === "thumbnail") thumbnailUrl = url;
        if (suffix === "card") cardUrl = url;
        if (suffix === "hero") heroUrl = url;
      }
    } catch (sharpError) {
      console.error("Sharp processing failed, using original only:", sharpError);
    }

    // Generate blurhash from a small version of the image
    let blurhash: string | null = null;
    try {
      const { data: pixels, info } = await sharp(buffer)
        .resize(32, 32, { fit: "cover" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      blurhash = encode(new Uint8ClampedArray(pixels), info.width, info.height, 4, 3);
    } catch (blurhashError) {
      console.error("Blurhash generation failed:", blurhashError);
    }

    const tenantId = await getTenantId();
    const [record] = await db
      .insert(media)
      .values({
        filename: file.name,
        alt,
        url: originalBlob.url,
        thumbnailUrl,
        cardUrl,
        heroUrl,
        mimeType: file.type,
        size: file.size,
        blurhash,
        tenantId,
      })
      .returning();

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload" },
      { status: 500 },
    );
  }
}
