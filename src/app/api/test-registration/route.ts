import { query } from "@/lib/supabase-db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    console.log("Creating test user in Supabase...");
    
    // Generate a unique email to avoid conflicts
    const uniqueId = uuidv4().slice(0, 8);
    const email = `test-user-${uniqueId}@example.com`;
    const password = await hash("testpassword", 10);
    
    // Insert the user directly with SQL
    const result = await query(
      `INSERT INTO "user" (id, email, name, password, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, "createdAt"`,
      [uuidv4(), email, `Test User ${uniqueId}`, password, new Date(), new Date()]
    );
    
    return NextResponse.json({
      success: true,
      message: "Test user created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to create test user", 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 