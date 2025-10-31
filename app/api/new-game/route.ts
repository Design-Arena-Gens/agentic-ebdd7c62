import { NextResponse } from "next/server";
import { newGame } from "@/lib/game";

export async function GET() {
  return NextResponse.json(newGame());
}
