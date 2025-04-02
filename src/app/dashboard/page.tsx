"use client";

import { Suspense, useEffect, useState } from "react";
import DashboardContent from "./DashboardContent";

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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-800">Loading...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
} 