import { NextRequest, NextResponse } from "next/server";
import { stepGame } from "@/lib/game";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = stepGame({ message: body?.message ?? "", state: body?.state });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
