import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const conversionId = params.id;

    if (!conversionId) {
      return NextResponse.json(
        { error: "Conversion ID is required" },
        { status: 400 }
      );
    }

    // Check if conversion exists and belongs to the user
    const conversion = await prisma.conversion.findUnique({
      where: {
        id: conversionId,
        userId,
      },
    });

    if (!conversion) {
      return NextResponse.json(
        { error: "Conversion not found" },
        { status: 404 }
      );
    }

    // Get only the page requested if specified
    const pageParam = request.nextUrl.searchParams.get('page');
    let xmlContent = conversion.convertedXml;
    
    if (pageParam && conversion.pageCount > 1) {
      const page = parseInt(pageParam);
      if (!isNaN(page) && page >= 1 && page <= conversion.pageCount) {
        const pageStartTag = `<page number="${page}">`;
        const pageEndTag = `</page>`;
        
        const pageStartIndex = conversion.convertedXml.indexOf(pageStartTag);
        const pageEndIndex = conversion.convertedXml.indexOf(pageEndTag, pageStartIndex) + pageEndTag.length;
        
        if (pageStartIndex !== -1 && pageEndIndex !== -1) {
          // Create a valid XML document with just this page
          xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n' + 
                       conversion.convertedXml.substring(pageStartIndex, pageEndIndex) +
                       '\n</document>';
        }
      }
    }
    
    // Parse metadata if present
    let metadata = {};
    if (conversion.metadata) {
      try {
        metadata = JSON.parse(conversion.metadata);
      } catch (e) {
        console.error("Error parsing metadata:", e);
        metadata = {};
      }
    }
    
    // Parse tags if present
    let tags: string[] = [];
    if (conversion.tags) {
      try {
        tags = JSON.parse(conversion.tags);
      } catch (e) {
        console.error("Error parsing tags:", e);
        tags = [];
      }
    }

    return NextResponse.json({ 
      conversion: {
        ...conversion,
        convertedXml: xmlContent,
        metadata,
        tags,
      },
      fullPageCount: conversion.pageCount,
      statistics: {
        detectedTables: conversion.detectedTables || 0,
        detectedLists: conversion.detectedLists || 0,
        detectedHeadings: conversion.detectedHeadings || 0, 
        detectedImages: conversion.detectedImages || 0,
        processingTime: conversion.processingTime || 0,
        characterCount: conversion.characterCount || 0,
        wordCount: conversion.wordCount || 0,
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching conversion:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversion" },
      { status: 500 }
    );
  }
} 