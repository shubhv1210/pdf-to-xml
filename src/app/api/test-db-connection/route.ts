import { safeClient } from "@/lib/db";
import { query } from "@/lib/supabase-db";
import { NextResponse } from "next/server";

export async function GET() {
  const response = {
    prisma: { success: false, message: "" },
    direct: { success: false, message: "" },
  };

  // Test Prisma connection
  try {
    await safeClient.$connect();
    response.prisma.success = true;
    response.prisma.message = "Prisma connection successful";
  } catch (error) {
    response.prisma.success = false;
    response.prisma.message = error instanceof Error ? error.message : String(error);
  }

  // Test direct database connection
  try {
    const result = await query('SELECT NOW() as time');
    response.direct.success = true;
    response.direct.message = "Direct connection successful";
    response.direct.time = result.rows[0].time;
  } catch (error) {
    response.direct.success = false;
    response.direct.message = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(response);
} 