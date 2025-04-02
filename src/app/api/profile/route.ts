import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Add type augmentation for the session
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

// Get user profile
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user email from session
    const email = session.user.email;
    
    if (!email) {
      return NextResponse.json({ error: "User email required" }, { status: 400 });
    }

    // Try to find user by email
    let user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // If user doesn't exist, create a temporary user record
    if (!user) {
      try {
        const hashedPassword = await hash("temporary-password", 10);
        const userId = session.user.id || uuidv4();
        
        user = await prisma.user.create({
          data: {
            id: userId,
            email,
            name: session.user.name || "User",
            password: hashedPassword,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
      } catch (error) {
        console.error("Failed to create user:", error);
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add default preferences if not present
    const preferences = { defaultStructureType: "enhanced" };

    return NextResponse.json({
      ...user,
      preferences: JSON.stringify(preferences)
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// Update user profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user email from session
    const email = session.user.email;
    
    if (!email) {
      return NextResponse.json({ error: "User email required" }, { status: 400 });
    }
    
    const data = await request.json();

    // Validate the data
    const { name, preferences } = data;

    // Try to find user by email
    let user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // If user doesn't exist, create a temporary user record
    if (!user) {
      try {
        const hashedPassword = await hash("temporary-password", 10);
        const userId = session.user.id || uuidv4();
        
        user = await prisma.user.create({
          data: {
            id: userId,
            email,
            name: session.user.name || "User",
            password: hashedPassword,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
      } catch (error) {
        console.error("Failed to create user:", error);
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare update data
    const prefsToReturn = preferences || { defaultStructureType: "enhanced" };

    // Only update the name if provided
    let updatedUser = user;
    if (name !== undefined) {
      try {
        updatedUser = await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            name,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
      } catch (error) {
        console.error("Failed to update user name:", error);
      }
    }

    // Return the user with the new preferences
    return NextResponse.json({
      ...updatedUser,
      preferences: typeof prefsToReturn === 'string' 
        ? prefsToReturn 
        : JSON.stringify(prefsToReturn)
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}

// Remove or comment out the unused functions
/*
function isValidUrl(urlString: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function _(string: string): string {
  // ... existing code ...
}
*/ 