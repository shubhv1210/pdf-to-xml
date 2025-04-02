import { User, connectDB } from "@/lib/db";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    console.log("Processing registration request");
    
    // Parse request body
    let name, email, password;
    try {
      const body = await req.json();
      name = body.name;
      email = body.email;
      password = body.password;
      console.log(`Registration attempt for email: ${email}`);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body - failed to parse JSON" },
        { status: 400 }
      );
    }

    if (!name || !email || !password) {
      console.log("Missing required fields:", { name: !!name, email: !!email, password: !!password });
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    try {
      const dbError = await connectDB();
      if (dbError) {
        console.error("MongoDB connection error:", dbError);
        return NextResponse.json(
          { 
            error: "Database connection failed",
            details: dbError instanceof Error ? dbError.message : String(dbError)
          },
          { status: 500 }
        );
      }
      console.log("MongoDB connection successful");
    } catch (dbError) {
      console.error("MongoDB connection error:", dbError);
      return NextResponse.json(
        { 
          error: "Database connection failed",
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }

    // Check if user exists
    try {
      console.log("Checking if user exists");
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        console.log(`User with email ${email} already exists`);
        return NextResponse.json(
          { error: "User already exists" },
          { status: 409 }
        );
      }
    } catch (findError) {
      console.error("Error checking for existing user:", findError);
      return NextResponse.json(
        { 
          error: "Failed to check for existing user",
          details: findError instanceof Error ? findError.message : String(findError)
        },
        { status: 500 }
      );
    }

    // Hash the password
    try {
      console.log("Hashing password");
      const hashedPassword = await hash(password, 10);

      // Create the user with MongoDB
      console.log("Creating new user with MongoDB");
      const user = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        name,
        email,
        passwordHash: hashedPassword
      });

      console.log(`User successfully created with ID: ${user._id}`);

      return NextResponse.json(
        {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
          },
        },
        { status: 201 }
      );
    } catch (createError) {
      console.error("Error creating user:", createError);
      return NextResponse.json(
        { 
          error: "Failed to create user",
          details: createError instanceof Error ? createError.message : String(createError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Registration error:", error);
    
    // Ensure we always return valid JSON
    return NextResponse.json(
      { 
        error: "Failed to register user",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 