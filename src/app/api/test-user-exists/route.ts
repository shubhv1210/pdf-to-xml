import { query } from "@/lib/supabase-db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // First, get a list of all user emails
    const usersResult = await query(`SELECT email FROM "user" LIMIT 10`);
    const users = usersResult.rows;
    
    // Use the first email to test the API
    let testEmail = "test@example.com"; // Default
    if (users.length > 0) {
      testEmail = users[0].email;
    }
    
    // Test both direct query and safeClient approach
    const response = {
      testEmail,
      directQuery: {
        success: false,
        exists: false,
        error: null
      },
      prismaQuery: {
        success: false,
        exists: false,
        error: null,
        response: null
      }
    };
    
    // Test direct query
    try {
      const result = await query(`SELECT id FROM "user" WHERE email = $1 LIMIT 1`, [testEmail]);
      response.directQuery.success = true;
      response.directQuery.exists = result.rows.length > 0;
    } catch (error) {
      response.directQuery.error = error instanceof Error ? error.message : String(error);
    }
    
    // Test the actual user-exists API endpoint
    try {
      const apiResult = await fetch(`http://localhost:3000/api/user-exists?email=${encodeURIComponent(testEmail)}`);
      response.prismaQuery.success = apiResult.ok;
      response.prismaQuery.response = await apiResult.json();
      response.prismaQuery.exists = response.prismaQuery.response?.exists;
    } catch (error) {
      response.prismaQuery.error = error instanceof Error ? error.message : String(error);
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error testing user-exists:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 