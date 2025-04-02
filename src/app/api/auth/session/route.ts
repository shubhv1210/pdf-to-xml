import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json(session || { user: null });
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json({ error: "Failed to get session data" }, { status: 500 });
  }
} 