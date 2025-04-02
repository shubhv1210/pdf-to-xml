import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get the database URL from environment
    const dbUrl = process.env.DATABASE_URL || 'Not set';
    
    // Create a safe version that masks the password
    const maskedUrl = dbUrl.replace(/(:.*@)/g, ':****@');
    
    // Parse the URL to extract components for testing
    let host = 'Unknown';
    let port = 'Unknown';
    let user = 'Unknown';
    let database = 'Unknown';
    
    try {
      // Try to parse the URL to extract components
      if (dbUrl && dbUrl !== 'Not set') {
        // Extract parts using regex for increased safety
        const hostMatch = dbUrl.match(/@([^:]+):(\d+)\//);
        const userMatch = dbUrl.match(/postgresql:\/\/([^:]+):/);
        const dbMatch = dbUrl.match(/\/([^/?]+)(\?|$)/);
        
        if (hostMatch) {
          host = hostMatch[1];
          port = hostMatch[2];
        }
        if (userMatch) {
          user = userMatch[1];
        }
        if (dbMatch) {
          database = dbMatch[1];
        }
      }
    } catch (parseError) {
      console.error("Error parsing DATABASE_URL:", parseError);
    }
    
    return NextResponse.json({
      databaseUrl: maskedUrl,
      components: {
        host,
        port,
        user,
        database
      },
      environment: process.env.NODE_ENV,
      tips: [
        "Check if the Supabase database is online",
        "Verify your project's connection string in Supabase dashboard",
        "Check if your IP is allowed in Supabase's network settings",
        "Make sure the DATABASE_URL in your .env file is correct",
        "If using IP restrictions in Supabase, ensure your current IP is allowed"
      ]
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to check database URL",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 