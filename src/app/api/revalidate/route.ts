import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paths, tags } = await request.json();

    const revalidated: { tags: string[]; paths: string[] } = {
      tags: [],
      paths: [],
    };

    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === "string") {
          revalidateTag(tag);
          revalidated.tags.push(tag);
        }
      }
    }

    if (Array.isArray(paths)) {
      for (const path of paths) {
        if (typeof path === "string") {
          revalidatePath(path);
          revalidated.paths.push(path);
        }
      }
    }

    return NextResponse.json({ revalidated, now: Date.now() });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
