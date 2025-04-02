import { query } from "@/lib/supabase-db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Listing tables in database...");
    
    // Query to list all tables in the public schema
    const result = await query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );

    const tables = result.rows.map(row => row.table_name);
    
    return NextResponse.json({
      success: true,
      tables
    });
  } catch (error) {
    console.error("Error listing tables:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 