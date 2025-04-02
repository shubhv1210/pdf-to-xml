import { connectDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Testing MongoDB connection...");
    const dbError = await connectDB();
    
    if (dbError) {
      console.error("MongoDB connection error:", dbError);
      return NextResponse.json(
        {
          success: false,
          message: "Database connection failed",
          error: dbError instanceof Error ? dbError.message : String(dbError),
          mongoUri: process.env.MONGODB_URI ? 
            `${process.env.MONGODB_URI.substring(0, 20)}...` : 
            "Not configured"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        message: "Successfully connected to MongoDB",
        env: process.env.NODE_ENV,
        mongoUri: process.env.MONGODB_URI ? 
          `${process.env.MONGODB_URI.substring(0, 20)}...` : 
          "Not configured"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Test connection error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Test connection failed",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 