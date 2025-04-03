"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiHome, 
  FiFileText, 
  FiUser, 
  FiLogOut, 
  FiMenu, 
  FiX, 
  FiGrid,
  FiChevronDown 
} from "react-icons/fi";

export default function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!mounted) return null;

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-[#1A1A1A]/70 backdrop-blur-lg shadow-md border-b border-[#C0C0C0]/20" 
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-shrink-0 flex items-center"
            >
              <Link href="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#C0C0C0] to-[#808080] flex items-center justify-center">
                  <FiFileText className="text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#D3D3D3] to-[#A9A9A9] metallic-text-bright">
                  PDF to XML
                </span>
              </Link>
            </motion.div>
            <nav className="hidden md:ml-8 md:flex md:space-x-6">
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Link
                  href="/"
                  className="group flex items-center px-1 py-2 text-sm font-medium text-[#D3D3D3] hover:text-[#FFFFFF] transition-colors"
                >
                  <FiHome className="mr-2 h-4 w-4" />
                  <span>Home</span>
                  <span className="block max-w-0 group-hover:max-w-full transition-all duration-300 h-0.5 bg-[#C0C0C0]"></span>
                </Link>
              </motion.div>
              {status === "authenticated" && (
                <>
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Link
                      href="/convert"
                      className="group flex items-center px-1 py-2 text-sm font-medium text-[#D3D3D3] hover:text-[#FFFFFF] transition-colors"
                    >
                      <FiFileText className="mr-2 h-4 w-4" />
                      <span>Convert</span>
                      <span className="block max-w-0 group-hover:max-w-full transition-all duration-300 h-0.5 bg-[#C0C0C0]"></span>
                    </Link>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Link
                      href="/dashboard"
                      className="group flex items-center px-1 py-2 text-sm font-medium text-[#D3D3D3] hover:text-[#FFFFFF] transition-colors"
                    >
                      <FiGrid className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                      <span className="block max-w-0 group-hover:max-w-full transition-all duration-300 h-0.5 bg-[#C0C0C0]"></span>
                    </Link>
                  </motion.div>
                </>
              )}
            </nav>
          </div>
          <div className="hidden md:flex md:items-center">
            {status === "authenticated" ? (
              <div className="relative ml-3">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <button
                    onClick={toggleMenu}
                    className="flex items-center space-x-2 text-sm rounded-full focus:outline-none"
                    id="user-menu-button"
                    aria-expanded={isMenuOpen}
                    aria-haspopup="true"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#D3D3D3] to-[#808080] flex items-center justify-center text-white shadow-lg">
                      {session?.user?.name?.charAt(0) || "U"}
                    </div>
                    <span className="text-[#D3D3D3] font-medium hidden lg:block">{session?.user?.name}</span>
                    <FiChevronDown className={`h-4 w-4 text-[#A9A9A9] transition-transform duration-200 ${isMenuOpen ? 'transform rotate-180' : ''}`} />
                  </button>
                </motion.div>

                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 bg-[#1A1A1A] ring-1 ring-[#C0C0C0]/30 focus:outline-none"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className="block px-4 py-2 text-sm text-[#D3D3D3] border-b border-[#333333]">
                        <div className="font-medium">{session?.user?.name}</div>
                        <div className="text-xs text-[#A9A9A9] truncate">{session?.user?.email}</div>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-[#D3D3D3] hover:bg-[#333333] hover:text-[#FFFFFF]"
                        role="menuitem"
                        onClick={toggleMenu}
                      >
                        <FiUser className="mr-2 h-4 w-4 text-[#A9A9A9]" />
                        Your Profile
                      </Link>
                      <button
                        onClick={() => signOut()}
                        className="flex w-full items-center text-left px-4 py-2 text-sm text-[#D3D3D3] hover:bg-[#333333] hover:text-[#FFFFFF]"
                        role="menuitem"
                      >
                        <FiLogOut className="mr-2 h-4 w-4 text-[#A9A9A9]" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  onClick={() => signIn()}
                  className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-[#A9A9A9] to-[#696969] hover:from-[#C0C0C0] hover:to-[#808080] shadow-md hover:shadow-lg transition-all"
                >
                  Sign In
                </button>
              </motion.div>
            )}
          </div>
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">{isMenuOpen ? "Close menu" : "Open menu"}</span>
              {isMenuOpen ? (
                <FiX className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FiMenu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className="md:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-[#1A1A1A] shadow-lg border-t border-[#333333]">
              <Link
                href="/"
                className="flex items-center pl-3 pr-4 py-2 text-base font-medium text-[#D3D3D3] hover:bg-[#333333] hover:text-[#FFFFFF] rounded-md"
                onClick={toggleMenu}
              >
                <FiHome className="mr-2 h-5 w-5" />
                Home
              </Link>
              {status === "authenticated" ? (
                <>
                  <Link
                    href="/convert"
                    className="flex items-center pl-3 pr-4 py-2 text-base font-medium text-[#D3D3D3] hover:bg-[#333333] hover:text-[#FFFFFF] rounded-md"
                    onClick={toggleMenu}
                  >
                    <FiFileText className="mr-2 h-5 w-5" />
                    Convert
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center pl-3 pr-4 py-2 text-base font-medium text-[#D3D3D3] hover:bg-[#333333] hover:text-[#FFFFFF] rounded-md"
                    onClick={toggleMenu}
                  >
                    <FiGrid className="mr-2 h-5 w-5" />
                    Dashboard
                  </Link>
                  <div className="pt-2 border-t border-[#333333] mt-2">
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center pl-3 pr-4 py-2 text-base font-medium text-[#D3D3D3] hover:bg-[#333333] hover:text-[#FFFFFF] rounded-md"
                    >
                      <FiLogOut className="mr-2 h-5 w-5" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="flex w-full items-center justify-center py-3 mt-3 bg-gradient-to-r from-[#A9A9A9] to-[#696969] hover:from-[#C0C0C0] hover:to-[#808080] text-white font-medium rounded-md"
                >
                  <FiUser className="mr-2 h-5 w-5" />
                  Sign In
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
} 