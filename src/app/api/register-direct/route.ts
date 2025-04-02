import { query } from "@/lib/supabase-db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const logs = [];
  
  try {
    logs.push("Starting registration process");
    
    // Parse the request body
    logs.push("Parsing request body");
    const { name, email, password } = await req.json();
    logs.push(`Received registration data for: ${email}`);
    
    // Validate inputs
    if (!name || !email || !password) {
      logs.push("Missing required fields");
      return NextResponse.json(
        { 
          error: "Name, email, and password are required",
          logs 
        },
        { status: 400 }
      );
    }

    logs.push("All required fields provided");
    
    // Check if user exists
    logs.push("Checking if user already exists");
    const existingUserResult = await query(
      `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (existingUserResult.rows.length > 0) {
      logs.push(`User with email ${email} already exists`);
      return NextResponse.json(
        { 
          error: "User already exists",
          logs 
        },
        { status: 409 }
      );
    }

    logs.push("User does not exist, proceeding with registration");
    
    // Hash the password
    logs.push("Hashing password");
    const hashedPassword = await hash(password, 10);
    const userId = uuidv4();
    const now = new Date();
    logs.push(`Generated user ID: ${userId}`);

    // Create the user
    logs.push("Inserting user into database");
    const result = await query(
      `INSERT INTO "user" (id, email, name, password, "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name, "createdAt"`,
      [userId, email, name, hashedPassword, now, now]
    );
    
    logs.push("User successfully registered");
    const user = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        logs
      },
      { status: 201 }
    );
  } catch (error) {
    logs.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error("Registration error:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to register user",
        details: error instanceof Error ? error.message : String(error),
        logs
      },
      { status: 500 }
    );
  }
} 