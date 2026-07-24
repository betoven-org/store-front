import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tags = body.tags as string[] | undefined;

  if (tags && tags.length > 0) {
    for (const tag of tags) revalidateTag(tag);
  } else {
    revalidateTag("pages");
    revalidateTag("posts");
  }

  return NextResponse.json({ revalidated: true });
}
