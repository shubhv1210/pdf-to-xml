import bcryptjs from "bcryptjs";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { User, connectDB } from "./db";

// This ensures the file is marked as a server component
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const authOptions: AuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Sign in",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "example@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        try {
          // Connect to MongoDB
          await connectDB();
          
          const user = await User.findOne({
            email: credentials.email,
          });

          if (!user) {
            return null;
          }

          // This code runs only on the server
          const isPasswordValid = await bcryptjs.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    session: ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
        },
      };
    },
    jwt: ({ token, user }) => {
      if (user) {
        return {
          ...token,
          id: user.id,
        };
      }
      return token;
    },
  },
  debug: process.env.NODE_ENV !== "production",
}; 