import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { writeFile } from "fs/promises";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import os from "os";
import path from "path";
import PDFParser from "pdf2json";
import { v4 as uuidv4 } from "uuid";

// Use the edge runtime to increase the execution timeout
export const maxDuration = 60;  // maximum 60 seconds for the function to run (hobby plan limit)
export const runtime = "nodejs";

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

// Add this type definition at the top of the file, after imports
type PDFTextItem = {
  x: number;
  y: number;
  w: number;
  h?: number;
  sw?: number;
  R: { T: string; S?: number }[];
  A?: string;
  oc?: boolean;
  clr?: number;
};

type PDFPage = {
  Width?: number;
  Height?: number;
  HLines?: { x: number; y: number; w: number; l: number }[];
  VLines?: { x: number; y: number; h: number; l: number }[];
  Fills?: unknown[];
  Texts: PDFTextItem[];
};

type PDFData = {
  Pages: PDFPage[];
  Meta?: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
  };
};

export async function POST(req: Request) {
  const startTime = Date.now();
  let tempFilePath = "";
  
  try {
    console.log("PDF conversion request received");
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const structureType = (formData.get("structureType") as string) || "enhanced";

    if (!file) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 }
      );
    }

    // Check if user exists in the database and create if needed
    const email = session.user.email;
    
    if (!email) {
      return NextResponse.json(
        { error: "User email required" },
        { status: 400 }
      );
    }
    
    console.log("Looking up user by email:", email);
    // Look up user by email
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log("User not found in database, creating temporary user");
      // User doesn't exist in the database, create a temporary user record
      const hashedPassword = await hash("temporary-password", 10);
      const userId = session.user.id || uuidv4();
      
      try {
        user = await prisma.user.create({
          data: {
            id: userId,
            email,
            name: session.user.name || "User",
            password: hashedPassword,
          },
        });
        console.log("Created user record for:", email);
      } catch (error) {
        console.error("Failed to create user:", error);
        return NextResponse.json(
          { error: "User account issue" },
          { status: 500 }
        );
      }
    }

    console.log("Creating conversion record for user:", user.id);
    // Create a conversion record with PENDING status
    const conversionId = uuidv4();
    const fileSize = file.size;
    const fileName = file.name;
    
    try {
      console.log("Creating conversion record with ID:", conversionId);
      const pendingConversion = await prisma.conversion.create({
        data: {
          id: conversionId,
          userId: user.id,
          filename: fileName,
          originalUrl: "",  // Will be updated later
          convertedXml: "",  // Will be updated later
          status: "PENDING",
          fileSize,
          pageCount: 0,
          structureType,
        },
      });
      console.log("Created conversion record successfully");
    } catch (createError) {
      console.error("Failed to create conversion record:", createError);
      return NextResponse.json(
        { 
          error: "Failed to create conversion record",
          details: createError instanceof Error ? createError.message : String(createError)
        },
        { status: 500 }
      );
    }

    // Create temporary file with a unique name to avoid conflicts
    const uniqueFilename = `${Date.now()}-${fileName}`;
    tempFilePath = path.join(os.tmpdir(), uniqueFilename);
    console.log("Creating temporary file at:", tempFilePath);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempFilePath, buffer);
    
    // Update conversion status to PROCESSING
    try {
      await prisma.conversion.update({
        where: { id: conversionId },
        data: { 
          status: "PROCESSING",
          originalUrl: uniqueFilename // Just store the filename, not the full path
        }
      });
      console.log("Updated conversion status to PROCESSING for ID:", conversionId);
    } catch (updateError) {
      console.error("Failed to update conversion to PROCESSING:", updateError);
      // Continue with the conversion despite the error
    }

    // Parse PDF to get content
    console.log("Parsing PDF content");
    const pdfParser = new PDFParser();
    
    const pdfData = await new Promise<PDFData>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (error) => {
        console.error("PDF parsing error:", error);
        reject(error);
      });
      pdfParser.on("pdfParser_dataReady", resolve);
      pdfParser.loadPDF(tempFilePath);
    });

    // Statistics tracking
    let detectedTables = 0;
    let detectedLists = 0;
    let detectedHeadings = 0;
    let detectedImages = 0;
    let characterCount = 0;
    let wordCount = 0;

    // Generate XML based on the requested structure type
    console.log(`Generating XML with structure type: ${structureType}`);
    let xmlContent: string;
    
    switch (structureType) {
      case "basic":
        xmlContent = generateBasicXml(pdfData);
        break;
      case "enhanced":
        const enhancedResult = generateEnhancedXml(pdfData);
        xmlContent = enhancedResult.xml;
        detectedLists = enhancedResult.detectedLists;
        detectedHeadings = enhancedResult.detectedHeadings;
        break;
      case "full":
        const fullResult = generateFullXml(pdfData);
        xmlContent = fullResult.xml;
        detectedTables = fullResult.detectedTables;
        detectedLists = fullResult.detectedLists;
        detectedHeadings = fullResult.detectedHeadings;
        detectedImages = fullResult.detectedImages;
        break;
      default:
        const defaultResult = generateEnhancedXml(pdfData);
        xmlContent = defaultResult.xml;
        detectedLists = defaultResult.detectedLists;
        detectedHeadings = defaultResult.detectedHeadings;
    }
    
    // Calculate word and character counts
    characterCount = xmlContent.length;
    wordCount = xmlContent.split(/\s+/).filter(Boolean).length;

    // Calculate processing time
    const processingTime = Date.now() - startTime;
    const pageCount = pdfData.Pages.length;

    // Generate tags for searchability
    const tags = JSON.stringify([
      fileName.replace('.pdf', ''),
      structureType,
      `pages:${pageCount}`,
      detectedTables > 0 ? 'tables' : '',
      detectedLists > 0 ? 'lists' : '',
      detectedHeadings > 0 ? 'headings' : '',
    ].filter(Boolean));

    // Extract metadata from PDF if available
    const metadata = JSON.stringify({
      title: pdfData.Meta?.Title || fileName,
      author: pdfData.Meta?.Author || '',
      subject: pdfData.Meta?.Subject || '',
      keywords: pdfData.Meta?.Keywords || '',
      creator: pdfData.Meta?.Creator || '',
      producer: pdfData.Meta?.Producer || '',
      creationDate: pdfData.Meta?.CreationDate || '',
    });

    // Update conversion with results
    try {
      console.log("Updating conversion with final results for ID:", conversionId);
      const conversion = await prisma.conversion.update({
        where: { id: conversionId },
        data: {
          convertedXml: xmlContent,
          pageCount,
          status: "COMPLETED",
          processingTime,
          detectedTables,
          detectedLists,
          detectedHeadings,
          detectedImages,
          characterCount,
          wordCount,
          tags,
          metadata,
        },
      });

      // No need to explicitly delete the temp file in serverless environment
      // it will be automatically cleaned up when the function ends

      console.log("Conversion completed successfully");
      return NextResponse.json({
        success: true,
        conversionId: conversion.id,
        xml: xmlContent,
        pageCount,
        structureType,
        statistics: {
          detectedTables,
          detectedLists,
          detectedHeadings,
          detectedImages,
          processingTime,
          characterCount,
          wordCount,
        }
      });
    } catch (updateError) {
      console.error("Failed to update conversion with results:", updateError);
      
      // Return the XML even if we couldn't update the conversion record
      return NextResponse.json({
        success: true,
        conversionId: conversionId,
        xml: xmlContent,
        pageCount,
        structureType,
        warning: "Failed to save conversion details",
        statistics: {
          detectedTables,
          detectedLists,
          detectedHeadings,
          detectedImages,
          processingTime,
          characterCount,
          wordCount,
        }
      });
    }
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { 
        error: "Failed to convert PDF to XML",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Basic structure - just texts with positions
function generateBasicXml(pdfData: PDFData): string {
  const pages = pdfData.Pages;
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n';
  
  pages.forEach((page: any, pageIndex: number) => {
    xmlContent += `  <page number="${pageIndex + 1}">\n`;
    
    const texts = page.Texts;
    texts.forEach((text: any) => {
      const textContent = decodeURIComponent(text.R[0].T);
      const x = text.x;
      const y = text.y;
      
      xmlContent += `    <text x="${x}" y="${y}">${textContent}</text>\n`;
    });
    
    xmlContent += '  </page>\n';
  });
  
  xmlContent += '</document>';
  
  return xmlContent;
}

// Enhanced structure - groups text into paragraphs based on positioning
function generateEnhancedXml(pdfData: PDFData): { 
  xml: string, 
  detectedLists: number, 
  detectedHeadings: number 
} {
  const pages = pdfData.Pages;
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n';
  
  let detectedLists = 0;
  let detectedHeadings = 0;
  
  pages.forEach((page: any, pageIndex: number) => {
    xmlContent += `  <page number="${pageIndex + 1}">\n`;
    
    // Group texts by approximate Y position (paragraphs)
    const texts = page.Texts;
    const paragraphs: Record<string, any[]> = {};
    
    // Track font sizes to help identify headers
    const fontSizes: number[] = [];
    texts.forEach((text: any) => {
      if (text.R && text.R[0] && text.R[0].TS) {
        const fontSize = text.R[0].TS[1];
        if (!fontSizes.includes(fontSize)) {
          fontSizes.push(fontSize);
        }
      }
    });
    
    // Sort font sizes in descending order
    fontSizes.sort((a, b) => b - a);
    
    texts.forEach((text: any) => {
      // Round the Y position to group nearby text lines
      const yKey = Math.round(text.y * 10) / 10;
      if (!paragraphs[yKey]) {
        paragraphs[yKey] = [];
      }
      paragraphs[yKey].push(text);
    });
    
    // Sort paragraphs by Y position
    const sortedYKeys = Object.keys(paragraphs).sort((a, b) => parseFloat(a) - parseFloat(b));
    
    // Output paragraphs with basic structure identification
    sortedYKeys.forEach((yKey) => {
      // Sort texts within paragraph by X position
      const sortedTexts = paragraphs[yKey].sort((a, b) => a.x - b.x);
      
      // Check if this is likely a header (larger font, short text)
      let isHeader = false;
      let headerLevel = 3; // Default to h3
      
      if (sortedTexts.length > 0 && sortedTexts.length < 10) {
        const text = sortedTexts[0];
        if (text.R && text.R[0] && text.R[0].TS) {
          const fontSize = text.R[0].TS[1];
          
          // Check if this is among the largest font sizes
          const fontSizeIndex = fontSizes.indexOf(fontSize);
          if (fontSizeIndex === 0) {
            isHeader = true;
            headerLevel = 1;
          } else if (fontSizeIndex === 1) {
            isHeader = true;
            headerLevel = 2;
          } else if (fontSizeIndex === 2) {
            isHeader = true;
            headerLevel = 3;
          }
        }
      }
      
      if (isHeader) {
        const headerText = sortedTexts.map(text => decodeURIComponent(text.R[0].T)).join(" ");
        xmlContent += `    <heading level="${headerLevel}" y="${yKey}">${headerText}</heading>\n`;
        detectedHeadings++;
      } else {
        // Check if this is a list item (starts with bullet or number)
        const firstText = sortedTexts.length > 0 ? decodeURIComponent(sortedTexts[0].R[0].T) : "";
        const isList = /^[•·\-–—*]|\d+[\.)]/.test(firstText);
        
        if (isList) {
          xmlContent += `    <list-item y="${yKey}">\n`;
          
          sortedTexts.forEach((text) => {
            const textContent = decodeURIComponent(text.R[0].T);
            xmlContent += `      <text x="${text.x}">${textContent}</text>\n`;
          });
          
          xmlContent += `    </list-item>\n`;
          detectedLists++;
        } else {
          xmlContent += `    <paragraph y="${yKey}">\n`;
          
          sortedTexts.forEach((text) => {
            const textContent = decodeURIComponent(text.R[0].T);
            xmlContent += `      <text x="${text.x}">${textContent}</text>\n`;
          });
          
          xmlContent += `    </paragraph>\n`;
        }
      }
    });
    
    xmlContent += '  </page>\n';
  });
  
  xmlContent += '</document>';
  
  return { xml: xmlContent, detectedLists, detectedHeadings };
}

// Full structure - tries to identify headers, paragraphs, tables and other document elements
function generateFullXml(pdfData: PDFData): { 
  xml: string, 
  detectedTables: number, 
  detectedLists: number, 
  detectedHeadings: number,
  detectedImages: number
} {
  const pages = pdfData.Pages;
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n';
  
  let detectedTables = 0;
  let detectedLists = 0;
  let detectedHeadings = 0;
  let detectedImages = 0;
  
  pages.forEach((page: any, pageIndex: number) => {
    xmlContent += `  <page number="${pageIndex + 1}">\n`;
    
    // Process images first if they exist
    if (page.Fills && page.Fills.length > 0) {
      xmlContent += `    <images>\n`;
      page.Fills.forEach((fill: any) => {
        if (fill.w && fill.h) {
          xmlContent += `      <image x="${fill.x}" y="${fill.y}" width="${fill.w}" height="${fill.h}" />\n`;
          detectedImages++;
        }
      });
      xmlContent += `    </images>\n`;
    }
    
    // Group texts by approximate Y position (paragraphs)
    const texts = page.Texts;
    const paragraphs: Record<string, any[]> = {};
    
    // Track font sizes to help identify headers
    const fontSizes: number[] = [];
    texts.forEach((text: any) => {
      if (text.R && text.R[0] && text.R[0].TS) {
        const fontSize = text.R[0].TS[1];
        if (!fontSizes.includes(fontSize)) {
          fontSizes.push(fontSize);
        }
      }
    });
    
    // Sort font sizes in descending order
    fontSizes.sort((a, b) => b - a);
    
    // Detect potential tables by looking for grid patterns
    const tableDetection = detectTables(texts);
    const tableCells = tableDetection.tableCells;
    detectedTables += tableDetection.tableCount;
    
    // Filter out texts that are already part of detected tables
    const nonTableTexts = texts.filter(text => 
      !tableCells.some(cell => 
        cell.texts.some(cellText => 
          cellText.x === text.x && cellText.y === text.y
        )
      )
    );
    
    // Process non-table texts
    nonTableTexts.forEach((text: any) => {
      // Round the Y position to group nearby text lines
      const yKey = Math.round(text.y * 10) / 10;
      if (!paragraphs[yKey]) {
        paragraphs[yKey] = [];
      }
      paragraphs[yKey].push(text);
    });
    
    // Sort paragraphs by Y position
    const sortedYKeys = Object.keys(paragraphs).sort((a, b) => parseFloat(a) - parseFloat(b));
    
    // Process tables
    if (tableDetection.tables.length > 0) {
      xmlContent += `    <tables>\n`;
      tableDetection.tables.forEach((table, tableIndex) => {
        xmlContent += `      <table id="table-${pageIndex+1}-${tableIndex+1}">\n`;
        
        // Process table rows
        const rowKeys = Object.keys(table.rows).sort((a, b) => parseFloat(a) - parseFloat(b));
        rowKeys.forEach((rowKey, rowIndex) => {
          xmlContent += `        <tr>\n`;
          
          // Process cells in this row
          const rowCells = table.rows[rowKey];
          // Sort cells by x position
          rowCells.sort((a: any, b: any) => a.x - b.x);
          
          rowCells.forEach((cell: any) => {
            const cellTexts = cell.texts.map((t: any) => decodeURIComponent(t.R[0].T)).join(" ");
            // Determine if this is a header cell
            const isHeader = rowIndex === 0 || cell.isHeader;
            if (isHeader) {
              xmlContent += `          <th>${cellTexts}</th>\n`;
            } else {
              xmlContent += `          <td>${cellTexts}</td>\n`;
            }
          });
          
          xmlContent += `        </tr>\n`;
        });
        
        xmlContent += `      </table>\n`;
      });
      xmlContent += `    </tables>\n`;
    }
    
    // Output paragraphs with structure identification
    sortedYKeys.forEach((yKey) => {
      // Sort texts within paragraph by X position
      const sortedTexts = paragraphs[yKey].sort((a, b) => a.x - b.x);
      
      // Check if this is likely a header (larger font, short text)
      let isHeader = false;
      let headerLevel = 3; // Default to h3
      
      if (sortedTexts.length > 0 && sortedTexts.length < 10) {
        const text = sortedTexts[0];
        if (text.R && text.R[0] && text.R[0].TS) {
          const fontSize = text.R[0].TS[1];
          
          // Check if this is among the largest font sizes
          const fontSizeIndex = fontSizes.indexOf(fontSize);
          if (fontSizeIndex === 0) {
            isHeader = true;
            headerLevel = 1;
          } else if (fontSizeIndex === 1) {
            isHeader = true;
            headerLevel = 2;
          } else if (fontSizeIndex === 2) {
            isHeader = true;
            headerLevel = 3;
          }
        }
      }
      
      if (isHeader) {
        const headerText = sortedTexts.map(text => decodeURIComponent(text.R[0].T)).join(" ");
        xmlContent += `    <heading level="${headerLevel}" y="${yKey}">${headerText}</heading>\n`;
        detectedHeadings++;
      } else {
        // Check if this is a list item (starts with bullet or number)
        const firstText = sortedTexts.length > 0 ? decodeURIComponent(sortedTexts[0].R[0].T) : "";
        const isList = /^[•·\-–—*]|\d+[\.)]/.test(firstText);
        
        if (isList) {
          xmlContent += `    <list-item y="${yKey}">\n`;
          
          sortedTexts.forEach((text) => {
            const textContent = decodeURIComponent(text.R[0].T);
            // Check for formatting (bold, italic)
            const isBold = text.R[0].TS && text.R[0].TS[2] > 1;
            const isItalic = text.R[0].TS && text.R[0].TS[3] > 0;
            
            if (isBold && isItalic) {
              xmlContent += `      <text x="${text.x}" style="bold-italic">${textContent}</text>\n`;
            } else if (isBold) {
              xmlContent += `      <text x="${text.x}" style="bold">${textContent}</text>\n`;
            } else if (isItalic) {
              xmlContent += `      <text x="${text.x}" style="italic">${textContent}</text>\n`;
            } else {
              xmlContent += `      <text x="${text.x}">${textContent}</text>\n`;
            }
          });
          
          xmlContent += `    </list-item>\n`;
          detectedLists++;
        } else {
          xmlContent += `    <paragraph y="${yKey}">\n`;
          
          sortedTexts.forEach((text) => {
            const textContent = decodeURIComponent(text.R[0].T);
            // Check for formatting (bold, italic)
            const isBold = text.R[0].TS && text.R[0].TS[2] > 1;
            const isItalic = text.R[0].TS && text.R[0].TS[3] > 0;
            
            if (isBold && isItalic) {
              xmlContent += `      <text x="${text.x}" style="bold-italic">${textContent}</text>\n`;
            } else if (isBold) {
              xmlContent += `      <text x="${text.x}" style="bold">${textContent}</text>\n`;
            } else if (isItalic) {
              xmlContent += `      <text x="${text.x}" style="italic">${textContent}</text>\n`;
            } else {
              xmlContent += `      <text x="${text.x}">${textContent}</text>\n`;
            }
          });
          
          xmlContent += `    </paragraph>\n`;
        }
      }
    });
    
    xmlContent += '  </page>\n';
  });
  
  xmlContent += '</document>';
  
  return { 
    xml: xmlContent, 
    detectedTables, 
    detectedLists, 
    detectedHeadings,
    detectedImages
  };
}

// Function to detect tables by analyzing grid patterns in text
function detectTables(texts: PDFTextItem[]): { 
  tables: Record<string, unknown>[],
  tableCells: Record<string, unknown>[], 
  tableCount: number 
} {
  const tables: Record<string, unknown>[] = [];
  const tableCells: Record<string, unknown>[] = [];
  let tableCount = 0;
  
  // First step: identify grid patterns
  const yPositions = new Set<number>();
  const xPositions = new Set<number>();
  
  // Collect all unique y and x positions
  texts.forEach(text => {
    const roundedY = Math.round(text.y * 10) / 10;
    const roundedX = Math.round(text.x * 10) / 10;
    yPositions.add(roundedY);
    xPositions.add(roundedX);
  });
  
  // Convert to sorted arrays
  const sortedYPositions = Array.from(yPositions).sort((a, b) => a - b);
  const sortedXPositions = Array.from(xPositions).sort((a, b) => a - b);
  
  // Find y positions that have multiple aligned texts (potential table rows)
  const potentialRowPositions: number[] = [];
  sortedYPositions.forEach(y => {
    const textsInRow = texts.filter(t => Math.round(t.y * 10) / 10 === y);
    if (textsInRow.length >= 3) {  // A row needs at least 3 cells to be considered part of a table
      potentialRowPositions.push(y);
    }
  });
  
  // Check for consecutive rows to identify tables
  let currentTableRows: number[] = [];
  const gapThreshold = 1.5; // Threshold for identifying gaps between table rows
  
  // Group rows into tables
  for (let i = 0; i < potentialRowPositions.length; i++) {
    const currentY = potentialRowPositions[i];
    
    if (currentTableRows.length === 0) {
      currentTableRows.push(currentY);
    } else {
      const lastY = currentTableRows[currentTableRows.length - 1];
      if (currentY - lastY < gapThreshold) {
        currentTableRows.push(currentY);
      } else {
        // End of table, process if it has at least 2 rows
        if (currentTableRows.length >= 2) {
          const table = processTableRows(currentTableRows, texts, sortedXPositions);
          tables.push(table);
          // Add cells to the overall list
          Object.values(table.rows).forEach((rowCells: any) => {
            tableCells.push(...rowCells);
          });
          tableCount++;
        }
        // Start a new potential table
        currentTableRows = [currentY];
      }
    }
  }
  
  // Process the last table if there is one
  if (currentTableRows.length >= 2) {
    const table = processTableRows(currentTableRows, texts, sortedXPositions);
    tables.push(table);
    // Add cells to the overall list
    Object.values(table.rows).forEach((rowCells: any) => {
      tableCells.push(...rowCells);
    });
    tableCount++;
  }
  
  return { tables, tableCells, tableCount };
}

// Helper to process rows of a detected table
function processTableRows(rowPositions: number[], texts: PDFTextItem[], xPositions: number[]) {
  const table = {
    rows: {} as Record<string, any[]>,
  };
  
  // Define columns based on x positions
  const columnPositions = findColumnPositions(rowPositions, texts, xPositions);
  
  // Assign texts to cells
  rowPositions.forEach(y => {
    table.rows[y] = [];
    
    // Get texts in this row
    const textsInRow = texts.filter(t => Math.round(t.y * 10) / 10 === y);
    
    // Group texts by column
    for (let i = 0; i < columnPositions.length - 1; i++) {
      const startX = columnPositions[i];
      const endX = columnPositions[i + 1];
      
      const textsInCell = textsInRow.filter(t => 
        t.x >= startX && (i === columnPositions.length - 2 || t.x < endX)
      );
      
      if (textsInCell.length > 0) {
        // Determine if this is a header cell (first row or formatting)
        const isHeader = rowPositions.indexOf(y) === 0 || 
                         textsInCell.some(t => t.R[0].TS && t.R[0].TS[2] > 1); // Bold text
        
        table.rows[y].push({
          x: startX,
          y: y,
          width: endX - startX,
          texts: textsInCell,
          isHeader
        });
      }
    }
  });
  
  return table;
}

// Helper to find column positions for a table
function findColumnPositions(rowPositions: number[], texts: PDFTextItem[], xPositions: number[]) {
  // Get all texts in the table rows
  const tableTexts = texts.filter(t => 
    rowPositions.some(y => Math.round(t.y * 10) / 10 === y)
  );
  
  // Count texts at each x position
  const xCounts = xPositions.map(x => ({
    x,
    count: tableTexts.filter(t => Math.abs(t.x - x) < 0.1).length
  }));
  
  // Sort by frequency
  xCounts.sort((a, b) => b.count - a.count);
  
  // Select top positions that have at least 2 entries
  const significantPositions = xCounts
    .filter(xCount => xCount.count >= 2)
    .map(xCount => xCount.x)
    .sort((a, b) => a - b);
  
  // Make sure we have a reasonable number of columns (at least 2)
  return significantPositions.length >= 2 ? significantPositions : xPositions;
} 