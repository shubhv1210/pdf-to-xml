import { authOptions } from "@/lib/auth";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

// Create the handler with error handling
const handler = async (req: Request, context: any) => {
  try {
    return await NextAuth(authOptions)(req, context);
  } catch (error) {
    console.error("NextAuth error:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Authentication error", 
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export { handler as GET, handler as POST };
