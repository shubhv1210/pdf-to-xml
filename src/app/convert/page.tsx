"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function ConvertPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [structureType, setStructureType] = useState("enhanced");
  const [conversionResult, setConversionResult] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [xmlDownloadUrl, setXmlDownloadUrl] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search by 300ms
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);
  const [conversionStatus, setConversionStatus] = useState({
    progress: 0,
    status: 'idle',
    message: ''
  });
  const [statistics, setStatistics] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState('xml');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load user preferences
  useEffect(() => {
    if (status === "authenticated") {
      const fetchPreferences = async () => {
        try {
          const response = await fetch("/api/profile");
          if (response.ok) {
            const data = await response.json();
            if (data.preferences) {
              try {
                const preferences = JSON.parse(data.preferences);
                if (preferences.defaultStructureType) {
                  setStructureType(preferences.defaultStructureType);
                }
              } catch (e) {
                // If preferences can't be parsed, use default
              }
            }
          }
        } catch (error) {
          // Silently fail and use defaults
        }
      };

      fetchPreferences();
    }
  }, [status]);

  // Clean up the PDF preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError("");
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }
    
    setPdfFile(file);
    
    // Create a preview URL for the PDF
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setPdfPreviewUrl(previewUrl);
  }, [pdfPreviewUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  // Conversion handler with real-time status updates
  const handleConvert = async () => {
    if (!pdfFile) {
      setError("Please select a PDF file");
      return;
    }

    // Reset state
    setError("");
    setConversionResult("");
    setStatistics(null);
    
    // Update status
    setConversionStatus({
      progress: 10,
      status: 'uploading',
      message: 'Uploading PDF file...'
    });

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("structureType", structureType);

      // Send the conversion request
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      // Check if the conversion was started successfully
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start conversion");
      }
      
      // Parse the initial response
      const data = await response.json();
      
      // If conversion was completed immediately
      if (data.success && data.conversionId && data.xml) {
        setConversionStatus({
          progress: 100,
          status: 'completed',
          message: 'Conversion completed successfully!'
        });
        
        // Store the full XML content
        setConversionResult(data.xml);
        
        // Extract and set the first page's content for display
        const firstPageXml = extractPageXml(data.xml, 1);
        setConversionResult(firstPageXml);
        
        if (data.statistics) {
          setStatistics(data.statistics);
        }
        
        return;
      }
      
      // If conversion is processing, start polling for updates
      if (data.conversionId) {
        setConversionStatus({
          progress: 30,
          status: 'processing',
          message: 'Processing PDF content...'
        });
        
        // Set up polling for status updates
        startStatusPolling(data.conversionId);
      }
    } catch (error: any) {
      console.error("Conversion error:", error);
      setError(error.message || "An error occurred during conversion");
      setConversionStatus({
        progress: 0,
        status: 'failed',
        message: error.message || "Conversion failed"
      });
    }
  };

  // Set up polling for conversion status
  const startStatusPolling = (id: string) => {
    // Clear any existing interval
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
    }
    
    // Create a new polling interval
    statusPollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversions/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to get conversion status");
        }
        
        const data = await response.json();
        const conversion = data.conversion;
        
        // Update conversion status based on the API response
        switch (conversion.status) {
          case "PENDING":
            setConversionStatus({
              progress: 20,
              status: 'processing',
              message: 'Waiting to process...'
            });
            break;
            
          case "PROCESSING":
            setConversionStatus({
              progress: 60,
              status: 'processing',
              message: 'Analyzing document structure...'
            });
            break;
            
          case "COMPLETED":
            // Conversion is complete, update the UI
            setConversionStatus({
              progress: 100,
              status: 'completed',
              message: 'Conversion completed successfully!'
            });
            
            // Store the full XML content
            setConversionResult(conversion.convertedXml);
            
            // Also set the first page's content for display
            const firstPageXml = extractPageXml(conversion.convertedXml, 1);
            setConversionResult(firstPageXml);
            
            if (data.statistics) {
              setStatistics(data.statistics);
            }
            
            // Clear the polling interval
            if (statusPollingRef.current) {
              clearInterval(statusPollingRef.current);
              statusPollingRef.current = null;
            }
            break;
            
          case "FAILED":
            setConversionStatus({
              progress: 0,
              status: 'failed',
              message: 'Conversion failed'
            });
            
            setError("Conversion failed. Please try again.");
            
            // Clear the polling interval
            if (statusPollingRef.current) {
              clearInterval(statusPollingRef.current);
              statusPollingRef.current = null;
            }
            break;
        }
      } catch (error) {
        console.error("Error polling conversion status:", error);
        
        // Update status to show error
        setConversionStatus({
          progress: 0,
          status: 'failed',
          message: 'Failed to get conversion status'
        });
        
        // Clear the polling interval
        if (statusPollingRef.current) {
          clearInterval(statusPollingRef.current);
          statusPollingRef.current = null;
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  // Helper function to extract page XML
  const extractPageXml = (fullXml: string, pageNumber: number): string => {
    const pageStartTag = `<page number="${pageNumber}">`;
    const pageEndTag = `</page>`;
    
    const pageStartIndex = fullXml.indexOf(pageStartTag);
    const pageEndIndex = fullXml.indexOf(pageEndTag, pageStartIndex) + pageEndTag.length;
    
    if (pageStartIndex !== -1 && pageEndIndex !== -1) {
      // Add XML declaration and document opening tag for proper XML structure
      return `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n  ${fullXml.substring(pageStartIndex, pageEndIndex)}\n</document>`;
    }
    
    return fullXml; // Return the full XML if page extraction fails
  };

  const handleCopyXml = () => {
    // Copy the appropriate XML content based on view mode
    const contentToCopy = conversionResult;
    
    if (contentToCopy) {
      navigator.clipboard.writeText(contentToCopy)
        .then(() => {
          // Show notification
          setShowCopyNotification(true);
          // Hide notification after 2 seconds
          setTimeout(() => {
            setShowCopyNotification(false);
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy XML: ', err);
        });
    }
  };

  const handleDownloadXml = () => {
    // Download the appropriate XML content based on view mode
    const contentToDownload = conversionResult;
    
    if (contentToDownload) {
      const blob = new Blob([contentToDownload], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Add page number to filename if viewing a specific page
      const filename = `converted-${pdfFile?.name.replace(".pdf", "")}.xml`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const handleViewHistory = () => {
    router.push("/dashboard");
  };

  const handleStructureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStructureType(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!pdfFile) {
      setError("Please select a PDF file to convert");
      return;
    }
    
    // ... existing code ...
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setPdfFile(files[0]);
      setError("");
    }
  };

  // Format filesize
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Search functionality - updated to use debounced search term
  useEffect(() => {
    if (!debouncedSearchTerm.trim() || !conversionResult) return;
    
    try {
      const term = debouncedSearchTerm.toLowerCase();
      const results: number[] = [];
      
      let lastIndex = -1;
      while (true) {
        lastIndex = conversionResult.toLowerCase().indexOf(term, lastIndex + 1);
        if (lastIndex === -1) break;
        results.push(lastIndex);
      }
      
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? 0 : -1);
      
      // Highlight the first result
      if (results.length > 0 && pdfContainerRef.current) {
        highlightSearchResult(0);
      }
    } catch (error) {
      console.error("Search error:", error);
      // Silently fail - don't update search results
    }
  }, [debouncedSearchTerm, conversionResult]);
  
  // Original handle search function - removed automatic search, only called on button click
  const handleSearch = () => {
    if (!searchTerm.trim() || !conversionResult) return;
    
    try {
      const term = searchTerm.toLowerCase();
      const results: number[] = [];
      
      let lastIndex = -1;
      while (true) {
        lastIndex = conversionResult.toLowerCase().indexOf(term, lastIndex + 1);
        if (lastIndex === -1) break;
        results.push(lastIndex);
      }
      
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? 0 : -1);
      
      // Highlight the first result
      if (results.length > 0 && pdfContainerRef.current) {
        highlightSearchResult(0);
      }
    } catch (error) {
      console.error("Search error:", error);
      // Silently fail - don't update search results
    }
  };
  
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    highlightSearchResult(newIndex);
  };
  
  const highlightSearchResult = (index: number) => {
    if (!pdfContainerRef.current || index < 0 || index >= searchResults.length) return;
    
    const preElement = pdfContainerRef.current.querySelector('pre');
    if (!preElement) return;
    
    // Get the text content and calculate the position
    const textContent = conversionResult;
    const position = searchResults[index];
    
    // Create a temporary div to measure positions
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.font = window.getComputedStyle(preElement).font;
    tempDiv.textContent = textContent.substring(0, position);
    document.body.appendChild(tempDiv);
    
    // Calculate the approximate scroll position
    const lineHeight = parseInt(window.getComputedStyle(preElement).lineHeight || '20');
    const lineCount = tempDiv.offsetHeight / lineHeight;
    const scrollPosition = lineCount * lineHeight;
    
    document.body.removeChild(tempDiv);
    
    // Scroll to the position
    pdfContainerRef.current.scrollTop = scrollPosition - 100; // Offset to show context
  };
  
  const resetSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setCurrentSearchIndex(-1);
  };

  // Reset search when changing pages
  useEffect(() => {
    resetSearch();
  }, []);

  // Helper function to render XML with highlighted search terms
  const getHighlightedContent = () => {
    if (!searchTerm.trim() || searchResults.length === 0) {
      return conversionResult;
    }
    
    try {
      const content = conversionResult;
      
      // First sanitize any potential highlight markers already in the content
      const sanitizedContent = content
        .replace(/###HIGHLIGHT_START(_CURRENT)?###/g, '&highlight-start&')
        .replace(/###HIGHLIGHT_END###/g, '&highlight-end&');
      
      const term = searchTerm;
      const parts = [];
      let lastIndex = 0;
      
      // Create a safe version of the search term for use in a regex
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedTerm, 'gi');
      let match;
      
      while ((match = regex.exec(sanitizedContent)) !== null) {
        const matchIndex = match.index;
        
        // Add the part before the match
        if (matchIndex > lastIndex) {
          parts.push(sanitizedContent.substring(lastIndex, matchIndex));
        }
        
        // Add the highlighted match
        const isCurrentMatch = currentSearchIndex !== -1 && searchResults[currentSearchIndex] === matchIndex;
        parts.push(`###HIGHLIGHT_START${isCurrentMatch ? '_CURRENT' : ''}###${match[0]}###HIGHLIGHT_END###`);
        
        lastIndex = matchIndex + match[0].length;
      }
      
      // Add the remaining content
      if (lastIndex < sanitizedContent.length) {
        parts.push(sanitizedContent.substring(lastIndex));
      }
      
      return parts.join('');
    } catch (error) {
      console.error("Error highlighting content:", error);
      return conversionResult;
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C0C0C0] mx-auto mb-4"></div>
          <p className="text-[#D3D3D3] metallic-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-[#D3D3D3] metallic-text-bright">Convert PDF to XML</h1>

      {error && (
        <div className="bg-[#3A1A1A] text-[#E8A9A9] p-3 rounded-md mb-4 font-medium border border-[#E8A9A9]/30">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upload and Settings */}
        <div className="lg:col-span-1">
          <div className="bg-[#121212] p-6 rounded-lg shadow-md mb-6 border border-[#333333]">
            <h2 className="text-xl font-semibold mb-4 text-[#D3D3D3] metallic-text">Upload PDF</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer h-48 flex items-center justify-center ${
                isDragActive ? "border-[#C0C0C0] bg-[#1A1A1A]" : "border-[#333333]"
              }`}
            >
              <input {...getInputProps()} />
              {pdfFile ? (
                <div>
                  <p className="text-[#D3D3D3] mb-2">Selected file: <span className="font-medium">{pdfFile.name}</span></p>
                  <p className="text-[#A9A9A9] text-sm">{formatFileSize(pdfFile.size)}</p>
                </div>
              ) : isDragActive ? (
                <p className="text-[#D3D3D3]">Drop the PDF file here</p>
              ) : (
                <div>
                  <svg className="w-12 h-12 mx-auto text-[#C0C0C0] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[#D3D3D3]">Drag and drop a PDF file here, or click to select</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label htmlFor="structureType" className="block mb-2 font-medium text-[#D3D3D3]">
                XML Structure Type
              </label>
              <select
                id="structureType"
                value={structureType}
                onChange={handleStructureChange}
                className="w-full p-2.5 border border-[#333333] rounded-md text-[#D3D3D3] bg-[#1A1A1A] mb-4 focus:outline-none focus:ring-1 focus:ring-[#C0C0C0]"
                disabled={conversionStatus.status === 'uploading' || conversionStatus.status === 'processing'}
              >
                <option value="basic">Basic (Text with positions)</option>
                <option value="enhanced">Enhanced (Text grouped by paragraphs)</option>
                <option value="full">Full (Complete document structure)</option>
              </select>

              <button
                onClick={handleConvert}
                disabled={!pdfFile || conversionStatus.status === 'uploading' || conversionStatus.status === 'processing'}
                className="w-full bg-gradient-to-r from-[#A9A9A9] to-[#696969] hover:from-[#C0C0C0] hover:to-[#808080] text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
              >
                {conversionStatus.status === 'idle' && "Convert to XML"}
                {conversionStatus.status === 'uploading' && "Uploading..."}
                {conversionStatus.status === 'processing' && "Processing..."}
                {conversionStatus.status === 'completed' && "Converted!"}
                {conversionStatus.status === 'failed' && "Try Again"}
              </button>
            </div>

            {/* Conversion Progress */}
            {(conversionStatus.status === 'uploading' || conversionStatus.status === 'processing') && (
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-[#C0C0C0] font-medium">{conversionStatus.message}</span>
                  <span className="text-[#C0C0C0] font-medium">{conversionStatus.progress}%</span>
                </div>
                <div className="w-full bg-[#1A1A1A] rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-[#A9A9A9] to-[#696969] h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                    style={{ width: `${conversionStatus.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Conversion Status Indicator */}
            {conversionStatus.status === 'completed' && (
              <div className="mt-4 p-3 bg-[#1A2A1A] text-[#A9E8A9] rounded-md border border-[#A9E8A9]/30">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Conversion completed successfully!</span>
                </div>
              </div>
            )}
            
            {conversionStatus.status === 'failed' && (
              <div className="mt-4 p-3 bg-[#3A1A1A] text-[#E8A9A9] rounded-md border border-[#E8A9A9]/30">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-medium">Conversion failed. Please try again.</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Structure Type Descriptions */}
          <div className="bg-[#121212] p-6 rounded-lg shadow-md border border-[#333333]">
            <h2 className="text-lg font-semibold mb-4 text-[#D3D3D3] metallic-text">Structure Types Explained</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-[#C0C0C0]">Basic</h3>
                <p className="text-[#A9A9A9] text-sm">Simple structure that preserves text content with position information. Good for simple documents.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-[#C0C0C0]">Enhanced</h3>
                <p className="text-[#A9A9A9] text-sm">Identifies paragraphs, headings, and basic formatting. Suitable for most documents.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-[#C0C0C0]">Full</h3>
                <p className="text-[#A9A9A9] text-sm">Advanced structure detection including tables, lists, images, and formatting. Best for complex documents.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Preview and Results */}
        <div className="lg:col-span-2">
          {/* PDF Preview Section */}
          <div className="bg-[#121212] p-6 rounded-lg shadow-md mb-6 border border-[#333333]">
            <h2 className="text-xl font-semibold mb-4 text-[#D3D3D3] metallic-text">
              {conversionResult ? "Document Preview" : "PDF Preview"}
            </h2>
            
            {pdfPreviewUrl ? (
              <div className="border border-[#333333] rounded-md overflow-hidden h-[400px]">
                <iframe
                  src={pdfPreviewUrl}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              </div>
            ) : (
              <div className="border border-[#333333] rounded-md h-[400px] flex items-center justify-center bg-[#1A1A1A]">
                <p className="text-[#A9A9A9]">No PDF selected yet</p>
              </div>
            )}
          </div>
          
          {/* XML Result Section */}
          {conversionResult && (
            <div className="bg-[#121212] p-6 rounded-lg shadow-md border border-[#333333]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-[#D3D3D3] metallic-text">Conversion Result</h2>
                <div className="space-x-2 relative">
                  <button
                    onClick={handleCopyXml}
                    className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#C0C0C0] font-medium py-1 px-3 rounded-md text-sm border border-[#333333]"
                  >
                    Copy XML
                  </button>
                  {showCopyNotification && (
                    <div className="absolute -top-8 right-0 bg-[#2A2A2A] text-[#D3D3D3] text-xs py-1 px-2 rounded shadow-md">
                      XML copied!
                    </div>
                  )}
                  <button
                    onClick={handleDownloadXml}
                    className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#C0C0C0] font-medium py-1 px-3 rounded-md text-sm border border-[#333333]"
                  >
                    Download XML
                  </button>
                  <button
                    onClick={handleViewHistory}
                    className="bg-gradient-to-r from-[#A9A9A9] to-[#696969] hover:from-[#C0C0C0] hover:to-[#808080] text-white font-medium py-1 px-3 rounded-md text-sm shadow-md hover:shadow-lg transition-all"
                  >
                    Conversion History
                  </button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="mb-4 flex items-center space-x-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search in XML content..."
                    className="w-full p-2 pr-24 border border-[#333333] rounded-md text-[#D3D3D3] bg-[#1A1A1A] text-sm focus:outline-none focus:ring-1 focus:ring-[#C0C0C0]"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute right-20 top-1/2 transform -translate-y-1/2 text-xs text-[#C0C0C0] font-medium">
                      {currentSearchIndex + 1} of {searchResults.length}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSearchResults([]);
                      setCurrentSearchIndex(-1);
                    }}
                    className={`absolute right-12 top-1/2 transform -translate-y-1/2 text-[#A9A9A9] hover:text-[#D3D3D3] ${!searchTerm ? 'hidden' : ''}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <button 
                  onClick={handleSearch}
                  className="bg-gradient-to-r from-[#A9A9A9] to-[#696969] hover:from-[#C0C0C0] hover:to-[#808080] text-white py-2 px-4 rounded-md text-sm font-medium shadow-md hover:shadow-lg transition-all"
                >
                  Search
                </button>
                {searchResults.length > 0 && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => navigateSearch('prev')}
                      className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#C0C0C0] p-2 rounded-md border border-[#333333]"
                      title="Previous result"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateSearch('next')}
                      className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#C0C0C0] p-2 rounded-md border border-[#333333]"
                      title="Next result"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Statistics Summary */}
              {statistics && (
                <div className="mb-4 grid grid-cols-4 gap-2 bg-[#1A1A1A] p-3 rounded-md border border-[#333333]">
                  <div className="text-center">
                    <div className="text-[#A9A9A9] text-xs font-medium">Characters</div>
                    <div className="font-medium text-[#D3D3D3]">{statistics.characterCount.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#A9A9A9] text-xs font-medium">Words</div>
                    <div className="font-medium text-[#D3D3D3]">{statistics.wordCount.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#A9A9A9] text-xs font-medium">Pages</div>
                    <div className="font-medium text-[#D3D3D3]">{conversionResult.split('\n').length - 1}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#A9A9A9] text-xs font-medium">Processing Time</div>
                    <div className="font-medium text-[#D3D3D3]">{(statistics.processingTime / 1000).toFixed(1)}s</div>
                  </div>
                </div>
              )}
              
              {/* XML Content Display */}
              <div ref={pdfContainerRef} className="bg-[#0A0A0A] p-4 rounded-md overflow-auto h-[300px] border border-[#333333]">
                <pre className="text-sm text-[#D3D3D3] font-medium whitespace-pre-wrap leading-relaxed">
                  {searchResults.length > 0 ? (
                    getHighlightedContent().split('###HIGHLIGHT_START').map((part, i) => {
                      if (i === 0) return part;
                      
                      try {
                        // Handle the current highlight case
                        const isCurrent = part.startsWith('_CURRENT');
                        const contentPart = isCurrent ? part.substring(8) : part;
                        
                        const splitParts = contentPart.split('###HIGHLIGHT_END###');
                        if (splitParts.length !== 2) return part;
                        
                        const [highlightedPart, restPart] = splitParts;
                        
                        if (isCurrent) {
                          return (
                            <React.Fragment key={i}>
                              <span className="bg-[#696969] text-[#FFFFFF] font-bold px-0.5 rounded">
                                {highlightedPart}
                              </span>
                              {restPart}
                            </React.Fragment>
                          );
                        }
                        
                        return (
                          <React.Fragment key={i}>
                            <span className="bg-[#333333] text-[#FFFFFF] font-medium px-0.5 rounded">
                              {highlightedPart}
                            </span>
                            {restPart}
                          </React.Fragment>
                        );
                      } catch (error) {
                        console.error("Error rendering highlight:", error);
                        return part;
                      }
                    })
                  ) : (
                    conversionResult
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 