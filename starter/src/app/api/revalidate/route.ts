import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { paths, tags } = body as {
    paths?: string[];
    tags?: string[];
  };

  let revalidated = 0;

  if (paths) {
    for (const path of paths) {
      revalidatePath(path);
      revalidated++;
    }
  }

  if (tags) {
    for (const tag of tags) {
      revalidateTag(tag);
      revalidated++;
    }
  }

  return NextResponse.json({ revalidated, ok: true });
}
