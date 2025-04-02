"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface ConversionDetail {
  id: string;
  userId: string;
  filename: string;
  originalUrl: string;
  convertedXml: string;
  createdAt: string;
  pageCount: number;
  structureType: string;
  detectedTables: number;
  detectedLists: number;
  detectedHeadings: number;
  detectedImages: number;
  status: string;
  processingTime: number;
  fileSize: number;
  characterCount: number;
  wordCount: number;
  tags: string[];
  metadata: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
    creator: string;
    producer: string;
    creationDate: string;
  };
}

interface ConversionStatistics {
  detectedTables: number;
  detectedLists: number;
  detectedHeadings: number;
  detectedImages: number;
  processingTime: number;
  characterCount: number;
  wordCount: number;
}

type Conversion = {
  id: string;
  filename: string;
  createdAt: string;
  status: string;
  pageCount: number;
  structureType: string;
  fileSize: number;
  processingTime: number;
  convertedXml: string;
  detectedTables: number;
  detectedLists: number;
  detectedHeadings: number;
  detectedImages: number;
  metadata: string;
};

export default function ViewConversionPage() {
  const router = useRouter();
  const params = useParams();
  const conversionId = params?.id as string;
  const { data: session, status } = useSession();
  const [conversion, setConversion] = useState<ConversionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'xml' | 'preview'>('xml');
  const [fullXml, setFullXml] = useState("");
  const [pageXml, setPageXml] = useState("");
  const [statistics, setStatistics] = useState<ConversionStatistics | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const xmlContainerRef = useRef<HTMLDivElement>(null);
  const pdfFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const fetchConversion = async () => {
      try {
        const response = await fetch(`/api/conversions/${conversionId}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          if (response.status === 404) {
            throw new Error("Conversion not found");
          }
          throw new Error("Failed to fetch conversion details");
        }
        
        const data = await response.json();
        setConversion(data.conversion);
        setFullXml(data.conversion.convertedXml);
        setStatistics(data.statistics);
        setCurrentPage(1);
        fetchPageXml(1, data.conversion.convertedXml);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && conversionId) {
      fetchConversion();
    }
  }, [conversionId, router, status]);

  // Fetch XML for a specific page
  const fetchPageXml = async (page: number, xmlContent: string) => {
    if (!xmlContent) return;
    
    const pageStartTag = `<page number="${page}">`;
    const pageEndTag = `</page>`;
    
    const pageStartIndex = xmlContent.indexOf(pageStartTag);
    const pageEndIndex = xmlContent.indexOf(pageEndTag, pageStartIndex) + pageEndTag.length;
    
    if (pageStartIndex !== -1 && pageEndIndex !== -1) {
      const extractedPageXml = xmlContent.substring(pageStartIndex, pageEndIndex);
      setPageXml(extractedPageXml);
      
      // Scroll to the top of the XML display
      if (xmlContainerRef.current) {
        xmlContainerRef.current.scrollTop = 0;
      }
    }
  };

  const handleChangePage = (newPage: number) => {
    if (conversion && newPage >= 1 && newPage <= conversion.pageCount) {
      setCurrentPage(newPage);
      fetchPageXml(newPage, fullXml);
    }
  };

  const handleCopyXml = () => {
    if (viewMode === 'xml') {
      // Copy either current page XML or full XML based on context
      const xmlToCopy = currentPage > 0 && pageXml ? pageXml : conversion?.convertedXml || "";
      navigator.clipboard.writeText(xmlToCopy);
    }
  };

  const handleDownloadXml = () => {
    if (conversion) {
      const blob = new Blob([conversion.convertedXml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `converted-${conversion.filename.replace(".pdf", "")}.xml`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const getStructureTypeLabel = (type: string) => {
    switch(type) {
      case "basic": return "Basic";
      case "enhanced": return "Enhanced";
      case "full": return "Full";
      default: return type || "Unknown";
    }
  };

  const getStructureTypeDescription = (type: string) => {
    switch(type) {
      case "basic": 
        return "Basic structure with text and positions";
      case "enhanced": 
        return "Enhanced structure with paragraphs and headings";
      case "full": 
        return "Full document structure with detailed formatting";
      default: 
        return "Custom structure";
    }
  };

  // Status label and color
  const getStatusInfo = (status: string) => {
    switch(status) {
      case "PENDING": 
        return { label: "Pending", color: "bg-yellow-100 text-yellow-800" };
      case "PROCESSING": 
        return { label: "Processing", color: "bg-blue-100 text-blue-800" };
      case "COMPLETED": 
        return { label: "Completed", color: "bg-green-100 text-green-800" };
      case "FAILED": 
        return { label: "Failed", color: "bg-red-100 text-red-800" };
      default: 
        return { label: status, color: "bg-gray-100 text-gray-800" };
    }
  };

  // Format date to a readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Format filesize
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format time duration
  const formatTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return ms + ' ms';
    return (ms / 1000).toFixed(1) + ' s';
  };

  // Highlight XML syntax (simple version)
  const highlightXml = (xml: string) => {
    return xml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(<\/?[^>]+>)/g, '<span class="text-blue-600">$1</span>')
      .replace(/"([^"]*)"/g, '"<span class="text-green-600">$1</span>"');
  };

  // Toggle view mode between XML and visual preview
  const toggleViewMode = () => {
    setViewMode(viewMode === 'xml' ? 'preview' : 'xml');
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-800">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conversion Details</h1>
        <Link
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 font-medium">
          {error}
        </div>
      )}

      {conversion ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar with info and stats */}
          <div className="lg:col-span-1">
            <div className="bg-white p-5 rounded-lg shadow-md mb-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
                File Information
                <button 
                  onClick={() => setShowMetadata(!showMetadata)} 
                  className="ml-auto text-sm text-blue-600 hover:text-blue-800"
                >
                  {showMetadata ? 'Hide Metadata' : 'Show Metadata'}
                </button>
              </h2>
              
              <div className="space-y-2">
                <p className="text-gray-800">
                  <span className="font-medium text-gray-900">File Name:</span> {conversion.filename || "Unnamed PDF"}
                </p>
                <p className="text-gray-800">
                  <span className="font-medium text-gray-900">Converted:</span> {formatDate(conversion.createdAt)}
                </p>
                <p className="text-gray-800">
                  <span className="font-medium text-gray-900">Pages:</span> {conversion.pageCount || 1}
                </p>
                <p className="text-gray-800">
                  <span className="font-medium text-gray-900">File Size:</span> {formatFileSize(conversion.fileSize)}
                </p>
                <p className="text-gray-800">
                  <span className="font-medium text-gray-900">Status:</span> 
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                    getStatusInfo(conversion.status).color
                  }`}>
                    {getStatusInfo(conversion.status).label}
                  </span>
                </p>
                <p className="text-gray-800">
                  <span className="font-medium text-gray-900">Structure Type:</span> 
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                    conversion.structureType === "basic" 
                      ? "bg-gray-100 text-gray-800" 
                      : conversion.structureType === "enhanced"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}>
                    {getStructureTypeLabel(conversion.structureType)}
                  </span>
                </p>
                <p className="text-gray-600 text-sm">
                  {getStructureTypeDescription(conversion.structureType)}
                </p>
              </div>
              
              {/* Metadata section (collapsible) */}
              {showMetadata && conversion.metadata && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Document Metadata</h3>
                  <div className="space-y-1 text-sm">
                    {conversion.metadata.title && (
                      <p><span className="font-medium">Title:</span> {conversion.metadata.title}</p>
                    )}
                    {conversion.metadata.author && (
                      <p><span className="font-medium">Author:</span> {conversion.metadata.author}</p>
                    )}
                    {conversion.metadata.subject && (
                      <p><span className="font-medium">Subject:</span> {conversion.metadata.subject}</p>
                    )}
                    {conversion.metadata.keywords && (
                      <p><span className="font-medium">Keywords:</span> {conversion.metadata.keywords}</p>
                    )}
                    {conversion.metadata.creator && (
                      <p><span className="font-medium">Creator:</span> {conversion.metadata.creator}</p>
                    )}
                    {conversion.metadata.producer && (
                      <p><span className="font-medium">Producer:</span> {conversion.metadata.producer}</p>
                    )}
                    {conversion.metadata.creationDate && (
                      <p><span className="font-medium">Created:</span> {conversion.metadata.creationDate}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Conversion Statistics */}
            <div className="bg-white p-5 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Conversion Stats</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">Characters:</span>
                  <span className="font-medium text-gray-900">{statistics?.characterCount.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Words:</span>
                  <span className="font-medium text-gray-900">{statistics?.wordCount.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Processing Time:</span>
                  <span className="font-medium text-gray-900">{formatTime(statistics?.processingTime)}</span>
                </div>
                
                <div className="border-t border-gray-200 my-3 pt-3">
                  <h3 className="font-medium text-gray-900 mb-2">Detected Elements</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 p-3 rounded-md text-center">
                      <div className="text-lg font-semibold text-gray-900">{statistics?.detectedTables || 0}</div>
                      <div className="text-xs text-gray-600">Tables</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md text-center">
                      <div className="text-lg font-semibold text-gray-900">{statistics?.detectedLists || 0}</div>
                      <div className="text-xs text-gray-600">Lists</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md text-center">
                      <div className="text-lg font-semibold text-gray-900">{statistics?.detectedHeadings || 0}</div>
                      <div className="text-xs text-gray-600">Headings</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md text-center">
                      <div className="text-lg font-semibold text-gray-900">{statistics?.detectedImages || 0}</div>
                      <div className="text-xs text-gray-600">Images</div>
                    </div>
                  </div>
                </div>
                
                {conversion.tags && conversion.tags.length > 0 && (
                  <div className="border-t border-gray-200 my-3 pt-3">
                    <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {conversion.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="lg:col-span-3">
            <div className="bg-white p-5 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {viewMode === 'xml' ? 'XML Content' : 'Visual Preview'}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleViewMode}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-3 rounded-md text-sm"
                  >
                    {viewMode === 'xml' ? 'Switch to Preview' : 'Switch to XML'}
                  </button>
                  {viewMode === 'xml' && (
                    <>
                      <button
                        onClick={handleCopyXml}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-3 rounded-md text-sm"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleDownloadXml}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1 px-3 rounded-md text-sm"
                      >
                        Download
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {conversion.pageCount > 1 && (
                <div className="mb-4 flex items-center justify-between bg-gray-50 p-2 rounded-md">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {conversion.pageCount}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleChangePage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="bg-white border border-gray-300 px-2 py-1 rounded text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    
                    <button
                      onClick={() => handleChangePage(currentPage + 1)}
                      disabled={currentPage === conversion.pageCount}
                      className="bg-white border border-gray-300 px-2 py-1 rounded text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              
              {/* XML or Preview content */}
              {viewMode === 'xml' ? (
                <div ref={xmlContainerRef} className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[600px] border border-gray-200">
                  <pre 
                    className="text-sm text-gray-800 font-mono"
                    dangerouslySetInnerHTML={{ __html: highlightXml(pageXml || fullXml || '') }}
                  />
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 h-[600px]">
                  <iframe
                    ref={pdfFrameRef}
                    src={`data:text/html;charset=utf-8,${encodeURIComponent(`
                      <html>
                        <head>
                          <style>
                            body { font-family: sans-serif; margin: 0; padding: 20px; }
                            h1, h2, h3 { color: #333; }
                            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            pre { white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 4px; }
                            .paragraph { margin-bottom: 10px; }
                            .heading { margin-top: 20px; margin-bottom: 10px; }
                            .list-item { margin-left: 20px; position: relative; padding-left: 15px; }
                            .list-item:before { content: "•"; position: absolute; left: 0; }
                          </style>
                        </head>
                        <body>${pageXml || '< No preview available >'}</body>
                      </html>
                    `)}`}
                    className="w-full h-full"
                    title="XML Preview"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-800">Conversion not found or you don't have permission to view it.</p>
        </div>
      )}
    </div>
  );
} 