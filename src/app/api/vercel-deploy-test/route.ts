import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const results = {
    database: { success: false, message: "", error: null },
    environment: {
      node_env: process.env.NODE_ENV,
      database_url_masked: process.env.DATABASE_URL?.replace(/:[^:]*@/, ":****@"),
      direct_url_masked: process.env.DIRECT_URL?.replace(/:[^:]*@/, ":****@"),
      nextauth_url: process.env.NEXTAUTH_URL,
      nextauth_secret: process.env.NEXTAUTH_SECRET ? "Set" : "Not set"
    }
  };

  try {
    console.log("Testing Prisma connection...");
    
    // Try to connect to the database
    await prisma.$connect();
    
    // If we get here, connection worked
    results.database.success = true;
    results.database.message = "Database connection successful";
    
    // Try a simple query
    try {
      const userCount = await prisma.user.count();
      results.database.message += ` (${userCount} users found)`;
    } catch (queryError) {
      console.error("Query failed but connection succeeded:", queryError);
      results.database.message += " (but query failed)";
      results.database.error = queryError instanceof Error ? queryError.message : String(queryError);
    }
  } catch (error) {
    console.error("Database connection failed:", error);
    results.database.success = false;
    results.database.message = "Database connection failed";
    results.database.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results);
} 