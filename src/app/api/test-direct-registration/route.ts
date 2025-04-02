import { query } from "@/lib/supabase-db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const logs = [];
  
  try {
    logs.push("Starting registration test");
    
    // Generate unique test data
    const uniqueId = uuidv4().slice(0, 8);
    const testUser = {
      id: uuidv4(),
      name: `Test User ${uniqueId}`,
      email: `test-reg-${uniqueId}@example.com`,
      password: await hash("Password123!", 10),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    logs.push(`Created test user data with email: ${testUser.email}`);
    
    // Check if the user already exists
    logs.push("Checking if user already exists");
    const existingUserResult = await query(
      `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
      [testUser.email]
    );
    
    if (existingUserResult.rows.length > 0) {
      logs.push(`A user with email ${testUser.email} already exists`);
      return NextResponse.json({
        success: false,
        message: "User already exists",
        logs
      });
    }
    
    logs.push("User does not exist, proceeding with registration");
    
    // Create the user
    logs.push("Inserting user into database");
    const result = await query(
      `INSERT INTO "user" (id, email, name, password, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, "createdAt"`,
      [
        testUser.id,
        testUser.email,
        testUser.name,
        testUser.password,
        testUser.createdAt,
        testUser.updatedAt
      ]
    );
    
    logs.push("User successfully inserted into database");
    
    const insertedUser = result.rows[0];
    logs.push(`User created with id: ${insertedUser.id}`);
    
    return NextResponse.json({
      success: true,
      message: "Registration test completed successfully",
      user: {
        id: insertedUser.id,
        name: insertedUser.name,
        email: insertedUser.email
      },
      logs
    });
  } catch (error) {
    logs.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Registration test error:", error);
    
    return NextResponse.json({
      success: false,
      message: "Registration test failed",
      error: error instanceof Error ? error.message : String(error),
      logs
    }, { status: 500 });
  }
} 