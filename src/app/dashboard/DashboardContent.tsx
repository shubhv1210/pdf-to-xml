'use client';

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Conversion = {
  id: string;
  filename: string;
  createdAt: string;
  status: string;
  pageCount: number;
  structureType: string;
  fileSize: number;
  processingTime: number;
  detectedTables: number;
  detectedLists: number;
  detectedHeadings: number;
  detectedImages: number;
  metadata: string;
};

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Custom hook for debounced search
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

export default function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState(searchParams?.get("search") || "");
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search term by 500ms
  const [selectedStructureType, setSelectedStructureType] = useState(searchParams?.get("structureType") || "");
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: searchParams?.get("dateFrom") || "",
    to: searchParams?.get("dateTo") || ""
  });
  const [sortBy, setSortBy] = useState(searchParams?.get("sortBy") || "createdAt");
  const [sortOrder, setSortOrder] = useState(searchParams?.get("sortOrder") || "desc");
  const [filterHasTables, setFilterHasTables] = useState(searchParams?.has("hasTables"));
  const [selectedStatus, setSelectedStatus] = useState(searchParams?.get("status") || "");
  
  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch conversions with filters
  const fetchConversions = useCallback(async (page = 1) => {
    try {
      if (status === "authenticated") {
        setLoading(true);
        
        // Build URL with filters
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "10");
        
        if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
        if (selectedStructureType) params.set("structureType", selectedStructureType);
        if (selectedDateRange.from) params.set("dateFrom", selectedDateRange.from);
        if (selectedDateRange.to) params.set("dateTo", selectedDateRange.to);
        if (sortBy) params.set("sortBy", sortBy);
        if (sortOrder) params.set("sortOrder", sortOrder);
        if (filterHasTables) params.set("hasTables", "true");
        if (selectedStatus) params.set("status", selectedStatus);
        
        const response = await fetch(`/api/conversions?${params.toString()}`);
        const data = await response.json();
        
        if (response.ok) {
          setConversions(data.conversions);
          setPagination(data.pagination);
        } else {
          setError(data.error || "Failed to fetch conversions");
        }
      }
    } catch (error) {
      console.error("Error fetching conversions:", error);
      setError("An error occurred while fetching your conversions");
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearchTerm, selectedStructureType, selectedDateRange, sortBy, sortOrder, filterHasTables, selectedStatus]);

  // Apply filters and update URL
  const applyFilters = useCallback(() => {
    if (!searchParams) return;
    
    const params = new URLSearchParams();
    
    if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
    if (selectedStructureType) params.set("structureType", selectedStructureType);
    if (selectedDateRange.from) params.set("dateFrom", selectedDateRange.from);
    if (selectedDateRange.to) params.set("dateTo", selectedDateRange.to);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    if (filterHasTables) params.set("hasTables", "true");
    if (selectedStatus) params.set("status", selectedStatus);
    
    router.push(`/dashboard?${params.toString()}`);
    fetchConversions(1);
  }, [fetchConversions, router, debouncedSearchTerm, selectedStructureType, selectedDateRange, sortBy, sortOrder, filterHasTables, selectedStatus, searchParams]);

  // Effect to trigger search when debounced search term changes
  useEffect(() => {
    if (status === "authenticated") {
      applyFilters();
    }
  }, [debouncedSearchTerm, status, applyFilters]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedStructureType("");
    setSelectedDateRange({ from: "", to: "" });
    setSortBy("createdAt");
    setSortOrder("desc");
    setFilterHasTables(false);
    setSelectedStatus("");
    router.push("/dashboard");
    fetchConversions(1);
  };

  // Initial fetch on mount
  useEffect(() => {
    if (status === "authenticated" && searchParams) {
      const page = parseInt(searchParams.get("page") || "1");
      fetchConversions(page);
    }
  }, [status, fetchConversions, searchParams]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (!searchParams) return;
    
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.push(`/dashboard?${params.toString()}`);
      fetchConversions(newPage);
    }
  };

  // Handle view conversion
  const handleViewConversion = (conversionId: string) => {
    router.push(`/view/${conversionId}`);
  };

  // Structure type label
  const getStructureTypeLabel = (type: string) => {
    switch(type) {
      case "basic": return "Basic";
      case "enhanced": return "Enhanced";
      case "full": return "Full";
      default: return type || "Unknown";
    }
  };

  // Status label and color
  const getStatusInfo = (status: string) => {
    switch(status) {
      case "PENDING": 
        return { label: "Pending", color: "bg-[#2A2A2A] text-[#C0C0C0]" };
      case "PROCESSING": 
        return { label: "Processing", color: "bg-[#1A2A3A] text-[#A9C4E8]" };
      case "COMPLETED": 
        return { label: "Completed", color: "bg-[#1A2A1A] text-[#A9E8A9]" };
      case "FAILED": 
        return { label: "Failed", color: "bg-[#3A1A1A] text-[#E8A9A9]" };
      default: 
        return { label: status, color: "bg-[#2A2A2A] text-[#C0C0C0]" };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C0C0C0] mx-auto mb-4"></div>
          <p className="text-[#D3D3D3] metallic-text">Loading your conversions...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#D3D3D3] metallic-text-bright">Your Conversion History</h1>
        <Link
          href="/convert"
          className="bg-gradient-to-r from-[#A9A9A9] to-[#696969] hover:from-[#C0C0C0] hover:to-[#808080] text-white py-2 px-4 rounded-md font-medium shadow-md hover:shadow-lg transition-all"
        >
          Convert New PDF
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 font-medium">
          {error}
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-[#121212] p-4 rounded-lg shadow-md mb-6 border border-[#333333]">
        <div className="mb-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#D3D3D3] metallic-text">Filters</h2>
          <button 
            onClick={resetFilters} 
            className="text-[#C0C0C0] hover:text-[#FFFFFF] text-sm font-medium flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-[#C0C0C0] mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by filename..."
              className="w-full px-3 py-2 text-[#D3D3D3] bg-[#1A1A1A] border border-[#333333] rounded-md focus:outline-none focus:ring-1 focus:ring-[#C0C0C0]"
            />
          </div>
          <div>
            <label htmlFor="structure" className="block text-sm font-medium text-[#C0C0C0] mb-1">
              Structure Type
            </label>
            <select
              id="structure"
              value={selectedStructureType}
              onChange={(e) => setSelectedStructureType(e.target.value)}
              className="w-full px-3 py-2 text-[#D3D3D3] bg-[#1A1A1A] border border-[#333333] rounded-md focus:outline-none focus:ring-1 focus:ring-[#C0C0C0]"
            >
              <option value="">All Types</option>
              <option value="basic">Basic</option>
              <option value="enhanced">Enhanced</option>
              <option value="full">Full</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[#C0C0C0] mb-1">
              Status
            </label>
            <select
              id="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-[#D3D3D3] bg-[#1A1A1A] border border-[#333333] rounded-md focus:outline-none focus:ring-1 focus:ring-[#C0C0C0]"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-[#C0C0C0] mb-1">
              Date From
            </label>
            <input
              type="date"
              id="dateFrom"
              value={selectedDateRange.from}
              onChange={(e) => setSelectedDateRange({...selectedDateRange, from: e.target.value})}
              className="w-full px-3 py-2 text-[#D3D3D3] bg-[#1A1A1A] border border-[#333333] rounded-md focus:outline-none focus:ring-1 focus:ring-[#C0C0C0]"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-[#C0C0C0] mb-1">
              Date To
            </label>
            <input
              type="date"
              id="dateTo"
              value={selectedDateRange.to}
              onChange={(e) => setSelectedDateRange({...selectedDateRange, to: e.target.value})}
              className="w-full px-3 py-2 text-[#D3D3D3] bg-[#1A1A1A] border border-[#333333] rounded-md focus:outline-none focus:ring-1 focus:ring-[#C0C0C0]"
            />
          </div>
          <div>
            <label htmlFor="hasTables" className="flex items-center text-sm font-medium text-[#C0C0C0] h-7 mb-1">
              <input
                type="checkbox"
                id="hasTables"
                checked={filterHasTables}
                onChange={(e) => setFilterHasTables(e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-[#333333] bg-[#1A1A1A] text-[#A9A9A9] focus:ring-[#A9A9A9]"
              />
              Has Tables
            </label>
            <div className="flex justify-end">
              <button
                onClick={applyFilters}
                className="bg-gradient-to-r from-[#A9A9A9] to-[#696969] hover:from-[#C0C0C0] hover:to-[#808080] text-white px-4 py-2 rounded-md font-medium shadow-md hover:shadow-lg transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {conversions.length === 0 ? (
        <div className="bg-[#121212] p-8 rounded-lg shadow-md text-center border border-[#333333]">
          <p className="text-[#D3D3D3] mb-4">No conversions found matching your criteria.</p>
          <button
            onClick={() => router.push("/convert")}
            className="bg-gradient-to-r from-[#A9A9A9] to-[#696969] hover:from-[#C0C0C0] hover:to-[#808080] text-white font-medium py-2 px-6 rounded-md shadow-md hover:shadow-lg transition-all"
          >
            Convert a PDF
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[#121212] rounded-lg shadow-md overflow-hidden mb-4 border border-[#333333]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1A1A1A]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#C0C0C0] uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#C0C0C0] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#C0C0C0] uppercase tracking-wider">
                      Pages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#C0C0C0] uppercase tracking-wider">
                      Structure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#C0C0C0] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#C0C0C0] uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#C0C0C0] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#0A0A0A] divide-y divide-[#333333]">
                  {conversions.map((conversion) => {
                    const statusInfo = getStatusInfo(conversion.status);
                    
                    return (
                      <tr key={conversion.id} className="hover:bg-[#1A1A1A]">
                        <td className="px-6 py-4 whitespace-nowrap text-[#D3D3D3] font-medium">
                          {conversion.filename || "Unnamed PDF"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#C0C0C0] text-sm">
                          {formatDate(conversion.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#C0C0C0] text-sm font-medium">
                          {conversion.pageCount || 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            conversion.structureType === "basic" 
                              ? "bg-gray-800 text-gray-300" 
                              : conversion.structureType === "enhanced"
                              ? "bg-blue-900 text-blue-200"
                              : "bg-green-900 text-green-200"
                          }`}>
                            {getStructureTypeLabel(conversion.structureType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#C0C0C0] text-sm">
                          <div className="flex space-x-2">
                            {conversion.detectedTables > 0 && (
                              <span title="Tables" className="inline-flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {conversion.detectedTables}
                              </span>
                            )}
                            {conversion.detectedLists > 0 && (
                              <span title="Lists" className="inline-flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                {conversion.detectedLists}
                              </span>
                            )}
                            {conversion.detectedImages > 0 && (
                              <span title="Images" className="inline-flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {conversion.detectedImages}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleViewConversion(conversion.id)}
                            className="text-[#C0C0C0] hover:text-[#FFFFFF] font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-[#C0C0C0]">
                Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</span> of <span className="font-medium">{pagination.totalItems}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="bg-[#1A1A1A] border border-[#333333] text-[#C0C0C0] hover:bg-[#222222] px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex">
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const pageNumber = i + 1;
                    // Show first, last, current, and adjacent pages. For others, show ellipsis.
                    if (
                      pageNumber === 1 ||
                      pageNumber === pagination.totalPages ||
                      (pageNumber >= pagination.currentPage - 1 && pageNumber <= pagination.currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          className={`px-3 py-1 mx-1 rounded-md text-sm font-medium ${
                            pageNumber === pagination.currentPage
                              ? "bg-gradient-to-r from-[#A9A9A9] to-[#696969] text-white"
                              : "bg-[#1A1A1A] border border-[#333333] text-[#C0C0C0] hover:bg-[#222222]"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      (pageNumber === 2 && pagination.currentPage > 3) ||
                      (pageNumber === pagination.totalPages - 1 && pagination.currentPage < pagination.totalPages - 2)
                    ) {
                      return <span key={pageNumber} className="px-2 py-1 text-[#A9A9A9]">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="bg-[#1A1A1A] border border-[#333333] text-[#C0C0C0] hover:bg-[#222222] px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 