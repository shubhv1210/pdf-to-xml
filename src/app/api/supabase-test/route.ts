import { getPool, query } from "@/lib/supabase-db";
import { NextResponse } from "next/server";

export async function GET() {
  let connection = false;
  let queryResult = null;
  let error = null;
  
  try {
    console.log("Testing Supabase connection...");
    
    // Try to get pool and run query
    await getPool();
    
    // Try a simple test query
    const result = await query('SELECT NOW() as time');
    queryResult = result.rows[0];
    
    connection = true;
  } catch (e) {
    console.error("Supabase connection test failed:", e);
    error = e instanceof Error ? e.message : String(e);
  }
  
  return NextResponse.json({
    success: connection,
    message: connection ? "Connected successfully to Supabase" : "Failed to connect to Supabase",
    data: queryResult,
    error,
    env: {
      database_url_masked: process.env.DATABASE_URL?.replace(/:[^:]*@/, ":*****@"),
      node_env: process.env.NODE_ENV,
    }
  });
} 