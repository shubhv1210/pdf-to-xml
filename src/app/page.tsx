"use client";

import { motion } from "framer-motion";
import { FiFileText, FiUpload, FiGrid, FiChevronRight, FiLayers, FiSearch, FiClock, FiCode, FiZap, FiServer } from "react-icons/fi";
import { useEffect, useState } from "react";
import Link from "next/link";

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

// Shimmer animation for metallic effect
const shimmer = {
  hidden: { backgroundPosition: "200% 0" },
  show: { 
    backgroundPosition: "0 0",
    transition: { 
      repeat: Infinity, 
      repeatType: "mirror" as const, 
      duration: 3,
      ease: "linear"
    }
  }
};

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setSession(data);
        setIsAuthenticated(!!data?.user);
      } catch (error) {
        console.error('Failed to fetch session', error);
      } finally {
        setMounted(true);
      }
    };
    
    checkSession();
  }, []);

  if (!mounted) {
    return null; // Return null on server-side or during mounting
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 mt-16">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#D3D3D3] to-[#A9A9A9] neon-text-glow metallic-text-bright">
          Quantum PDF Transformer
        </h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-xl md:text-2xl max-w-3xl mx-auto mb-10 text-[#C0C0C0] metallic-text"
        >
          Leverage AI-powered algorithms to transmute unstructured PDF data into clean, semantic XML architecture with neural layout recognition.
        </motion.p>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mb-12"
      >
        <motion.div 
          variants={item}
          className="relative group"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <motion.div 
            className="absolute -inset-0.5 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-500"
            style={{ 
              background: "linear-gradient(45deg, #555555, #999999, #d3d3d3, #999999, #555555)",
              backgroundSize: "200% auto"
            }}
            variants={shimmer}
            initial="hidden"
            animate="show"
          ></motion.div>
          <div className="relative p-6 bg-black/90 rounded-xl shadow-xl border border-[#C0C0C0]/30 backdrop-blur-sm neon-box">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-[#A9A9A9]/20 to-[#D3D3D3]/20 text-[#C0C0C0] mb-4">
              <FiCode className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold mb-3 text-[#C0C0C0] metallic-text">
              Neural Structure Detection
            </h2>
            <p className="text-[#D3D3D3]">
              Our quantum parsing engine identifies document hierarchies, tables, and semantic elements through deep learning analysis for pixel-perfect XML mapping.
            </p>
          </div>
        </motion.div>

        <motion.div 
          variants={item}
          className="relative group"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <motion.div 
            className="absolute -inset-0.5 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-500"
            style={{ 
              background: "linear-gradient(45deg, #555555, #999999, #d3d3d3, #999999, #555555)",
              backgroundSize: "200% auto"
            }}
            variants={shimmer}
            initial="hidden"
            animate="show"
          ></motion.div>
          <div className="relative p-6 bg-black/90 rounded-xl shadow-xl border border-[#C0C0C0]/30 backdrop-blur-sm neon-box">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-[#A9A9A9]/20 to-[#D3D3D3]/20 text-[#C0C0C0] mb-4">
              <FiZap className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold mb-3 text-[#C0C0C0] metallic-text">
              Zero-Latency Processing
            </h2>
            <p className="text-[#D3D3D3]">
              Experience millisecond transformations with our edge-deployed conversion matrix that leverages multi-threaded parallel processing for instant results.
            </p>
          </div>
        </motion.div>

        <motion.div 
          variants={item}
          className="relative group"
          whileHover={{ scale: 1.03 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <motion.div 
            className="absolute -inset-0.5 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-500"
            style={{ 
              background: "linear-gradient(45deg, #555555, #999999, #d3d3d3, #999999, #555555)",
              backgroundSize: "200% auto"
            }}
            variants={shimmer}
            initial="hidden"
            animate="show"
          ></motion.div>
          <div className="relative p-6 bg-black/90 rounded-xl shadow-xl border border-[#C0C0C0]/30 backdrop-blur-sm neon-box">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-gradient-to-r from-[#A9A9A9]/20 to-[#D3D3D3]/20 text-[#C0C0C0] mb-4">
              <FiServer className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold mb-3 text-[#C0C0C0] metallic-text">
              Version Control Integration
            </h2>
            <p className="text-[#D3D3D3]">
              Track document evolution with blockchain-secured revision history that captures every transformation state and allows for temporal rollbacks.
            </p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl w-full mb-16"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div 
          variants={item} 
          className="relative group p-6 bg-black/90 rounded-xl shadow-xl border border-[#C0C0C0]/30 neon-box"
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 0.2 }}
          />
          <h3 className="text-lg font-medium flex items-center mb-4 text-[#C0C0C0] metallic-text">
            <FiSearch className="mr-2" />
            Semantic Pattern Recognition
          </h3>
          <p className="text-[#D3D3D3] mb-2">
            Identify and extract complex patterns from your documents with our AI-powered semantic analysis engine that understands context.
          </p>
        </motion.div>
        
        <motion.div 
          variants={item} 
          className="relative group p-6 bg-black/90 rounded-xl shadow-xl border border-[#C0C0C0]/30 neon-box"
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 0.2 }}
          />
          <h3 className="text-lg font-medium flex items-center mb-4 text-[#C0C0C0] metallic-text">
            <FiClock className="mr-2" />
            Quantum Batch Processing
          </h3>
          <p className="text-[#D3D3D3] mb-2">
            Transform thousands of documents simultaneously with our distributed computing architecture that scales dynamically with workload.
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        {isAuthenticated ? (
          <Link
            href="/convert"
            className="group relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-medium rounded-md bg-black border border-[#C0C0C0] text-[#C0C0C0] metallic-text shadow-md hover:shadow-xl transition-all duration-300"
          >
            <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-[#D3D3D3] opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
            <FiFileText className="mr-2 h-5 w-5" />
            Initialize Transformation
            <FiChevronRight className="ml-2 h-5 w-5" />
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-medium rounded-md bg-black border border-[#C0C0C0] text-[#C0C0C0] metallic-text shadow-md hover:shadow-xl transition-all duration-300"
            >
              <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-[#D3D3D3] opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
              Access Portal
              <FiChevronRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/register"
              className="relative inline-flex items-center justify-center px-8 py-3 overflow-hidden font-medium text-[#C0C0C0] metallic-text border border-[#C0C0C0] rounded-md hover:bg-black/50 transition-all duration-300"
            >
              Create Secure Identity
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
