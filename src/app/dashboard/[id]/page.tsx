"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  wordCount: number;
  characterCount: number;
  metadata: string;
};

export default function ConversionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const conversionId = params?.id as string;
  const { status } = useSession();
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          throw new Error("Failed to fetch conversion");
        }
        
        const data = await response.json();
        setConversion(data);
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

  const handleCopyXml = () => {
    if (conversion) {
      navigator.clipboard.writeText(conversion.convertedXml);
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

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-800">Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conversion Details</h1>
        <Link
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Conversions
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 font-medium">
          {error}
        </div>
      )}

      {conversion ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">File Information</h2>
            <p className="text-gray-800"><strong className="text-gray-900">File Name:</strong> {conversion.filename}</p>
            <p className="text-gray-800"><strong className="text-gray-900">Converted on:</strong> {new Date(conversion.createdAt).toLocaleString()}</p>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-900">XML Content</h2>
              <div className="space-x-2">
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
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96 border border-gray-200">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap break-all">
                {conversion.convertedXml}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-800">Conversion not found.</p>
        </div>
      )}
    </div>
  );
} 