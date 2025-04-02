import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const structureType = searchParams.get('structureType') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const hasTables = searchParams.has('hasTables') ? true : undefined;
    const status = searchParams.get('status') || undefined;

    // Validate and prepare the where clause
    const where: Record<string, unknown> = { userId };
    
    // Search in filename and tags - use simple contains without mode parameter
    if (search) {
      where.OR = [
        { filename: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    
    // Filter by structure type
    if (structureType) {
      where.structureType = structureType;
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }
    
    // Filter by conversion status
    if (status) {
      where.status = status;
    }
    
    // Filter by presence of tables
    if (hasTables) {
      where.detectedTables = { gt: 0 };
    }
    
    // Prepare the order clause
    const orderBy: Record<string, string> = {};
    if (sortBy === 'filename' || sortBy === 'createdAt' || sortBy === 'pageCount') {
      orderBy[sortBy] = sortOrder;
    } else {
      // Default sort by created date
      orderBy.createdAt = 'desc';
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalCount = await prisma.conversion.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Get conversions with pagination and filtering
    const conversions = await prisma.conversion.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        userId: true,
        filename: true,
        originalUrl: true,
        convertedXml: true,
        createdAt: true,
        pageCount: true,
        structureType: true,
        detectedTables: true,
        detectedLists: true,
        detectedHeadings: true,
        detectedImages: true,
        status: true,
        processingTime: true,
        fileSize: true,
        characterCount: true,
        wordCount: true,
        tags: true,
        metadata: true,
      },
    });

    return NextResponse.json({ 
      conversions, 
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching conversions:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversions" },
      { status: 500 }
    );
  }
} 