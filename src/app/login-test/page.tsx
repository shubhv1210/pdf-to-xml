"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginTestPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const checkUser = async () => {
    if (!email) return;
    
    try {
      const response = await fetch(`/api/test-signin?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setDetails(null);

    try {
      console.log("Attempting sign in with:", { email, password });
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("Sign in result:", result);
      setDetails({ signInResult: result });

      if (result?.error) {
        setError(`Error: ${result.error}`);
      } else {
        setDetails(prev => ({ ...prev, success: true }));
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError(`Exception: ${error instanceof Error ? error.message : String(error)}`);
      setDetails({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-4">
      <h1 className="text-2xl font-bold mb-6">Login Test</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-4">
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2 font-medium">Email</label>
          <div className="flex space-x-2">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 p-2 border rounded"
              required
            />
            <button 
              type="button" 
              onClick={checkUser}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Check
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="password" className="block mb-2 font-medium">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
      
      {details && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Debug Info:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-80 text-sm">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-4 text-center">
        <Link href="/register-test" className="text-blue-600 hover:underline">
          Go to Test Registration
        </Link>
      </div>
    </div>
  );
} 