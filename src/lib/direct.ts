import { PrismaClient } from "@prisma/client";

// This file is for testing direct connection to the database
// without using the global singleton

export async function testDatabaseConnection() {
  try {
    console.log("Attempting direct connection to database...");
    console.log(`Using connection string: ${process.env.DATABASE_URL?.replace(/:[^:]*@/, ":*****@")}`);
    
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log("Successfully connected to database!");
    
    // Try a simple query
    const count = await prisma.user.count();
    console.log(`Number of users in database: ${count}`);
    
    await prisma.$disconnect();
    return { success: true, message: "Connection successful" };
  } catch (error) {
    console.error("Database connection test failed:", error);
    return { 
      success: false, 
      message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 