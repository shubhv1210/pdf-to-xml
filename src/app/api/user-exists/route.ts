import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("Checking if user exists...");
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      console.log("No email provided");
      return NextResponse.json(
        { error: "Email parameter is required", exists: false },
        { status: 400 }
      );
    }

    console.log(`Checking if user exists with email: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true
      }
    });

    console.log(`User exists: ${!!user}`);
    
    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error("Error checking if user exists:", error);
    // Don't throw an error, just report that the user doesn't exist
    // This prevents the registration flow from breaking
    return NextResponse.json(
      { exists: false },
      { status: 200 }
    );
  }
} 