import { NextResponse } from "next/server";
import { Pool } from 'pg';

export async function GET() {
  let connection = false;
  let error = null;
  let client = null;
  
  try {
    console.log("Testing direct PG connection to Supabase...");
    
    // Parse the connection string
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("DATABASE_URL is not defined");
    }
    
    // Create a new pool
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for some SSL connections
      }
    });
    
    // Get a client from the pool
    client = await pool.connect();
    console.log("Direct PG connection successful");
    
    // Run a test query
    const result = await client.query('SELECT NOW()');
    console.log("Query result:", result.rows[0]);
    
    connection = true;
  } catch (e) {
    console.error("Direct PG connection test failed:", e);
    error = e instanceof Error ? e.message : String(e);
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
  }
  
  return NextResponse.json({
    success: connection,
    message: connection ? "Direct PG connection successful" : "Direct PG connection failed",
    error,
    env: {
      database_url_masked: process.env.DATABASE_URL?.replace(/:[^:]*@/, ":*****@"),
      node_env: process.env.NODE_ENV,
    }
  });
} 