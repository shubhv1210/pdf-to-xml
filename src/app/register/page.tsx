"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      // Check if user exists
      const existingUser = await fetch("/api/user-exists?email=" + encodeURIComponent(email));
      const { exists } = await existingUser.json();
      
      if (exists) {
        throw new Error("User with this email already exists");
      }

      // Create user through API - password will be hashed on the server
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password, // Send plain password to be hashed on the server
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create account");
      }

      // Sign in the user
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }

      // Redirect to homepage
      router.push("/");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Create an Account</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 font-medium">
          {error}
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
              placeholder="Your name"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block mb-2 font-medium text-gray-800">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800"
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 font-medium text-gray-800">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-md text-gray-800"
              placeholder="••••••••"
              required
              minLength={8}
            />
            <p className="mt-1 text-sm text-gray-600">
              Must be at least 8 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
} 