"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: string;
}

interface UserPreferences {
  defaultStructureType: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [name, setName] = useState("");
  const [defaultStructureType, setDefaultStructureType] = useState("enhanced");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (status === "authenticated") {
          const response = await fetch("/api/profile");
          if (response.ok) {
            const data: UserProfile = await response.json();
            setName(data.name || "");
            
            if (data.preferences) {
              try {
                const preferences: UserPreferences = JSON.parse(data.preferences);
                if (preferences.defaultStructureType) {
                  setDefaultStructureType(preferences.defaultStructureType);
                }
              } catch (e) {
                // If preferences can't be parsed, use defaults
              }
            }
          }
        }
      } catch (error) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const preferences: UserPreferences = {
        defaultStructureType: defaultStructureType
      };

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          preferences,
        }),
      });

      if (response.ok) {
        setSuccessMessage("Profile saved successfully");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save profile");
      }
    } catch (error) {
      setError("An error occurred while saving your profile");
    } finally {
      setSaving(false);
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
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Profile Settings</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 font-medium">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4 font-medium">
          {successMessage}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block mb-2 font-medium text-gray-800">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="defaultStructureType" className="block mb-2 font-medium text-gray-800">
              Default XML Structure Type
            </label>
            <select
              id="defaultStructureType"
              value={defaultStructureType}
              onChange={(e) => setDefaultStructureType(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800"
            >
              <option value="basic">Basic (Text with positions)</option>
              <option value="enhanced">Enhanced (Text grouped by paragraphs)</option>
              <option value="full">Full (Complete document structure)</option>
            </select>
            <p className="mt-1 text-sm text-gray-600">
              This will be the default structure type used when converting PDFs.
            </p>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 