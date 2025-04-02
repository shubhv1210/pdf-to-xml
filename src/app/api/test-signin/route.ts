import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
  }

  try {
    // Test direct database connection
    const logs = [];
    logs.push(`Testing authentication for: ${email}`);
    
    // 1. Try to fetch the user with Prisma
    logs.push("Fetching user with Prisma");
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          password: true
        }
      });
      
      if (user) {
        logs.push(`Found user with ID: ${user.id}`);
        logs.push(`User has password: ${!!user.password}`);
      } else {
        logs.push("User not found with Prisma");
      }
    } catch (error) {
      logs.push(`Error fetching user with Prisma: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return NextResponse.json({
      success: !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        hasPassword: !!user.password
      } : null,
      logs
    });
  } catch (error) {
    console.error("Auth test error:", error);
    return NextResponse.json({
      error: "Authentication test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 