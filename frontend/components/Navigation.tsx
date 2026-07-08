"use client";

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { getDashboardPath, normalizeLocale } from '@/lib/auth/routing';

export default function Navigation() {
  const { session, isLoading, logout } = useAuth();
  const { locale } = useParams<{ locale?: string }>();
  const user = session?.user;
  const isAdmin = session?.isAdmin ?? false;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const routeLocale = normalizeLocale(locale);
  const dashboardHref = getDashboardPath(routeLocale, session?.userRole);

  if (isLoading) {
    return null;
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              SUBUL
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                
                {isAdmin && (
                  <Link
                    href={`/${routeLocale}/dashboard/admin`}
                    className="bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    Admin Panel
                  </Link>
                )}
                
                <button
                  type="button"
                  onClick={() => logout()}
                  className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                  href={`/${routeLocale}/auth/login`}
                  className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Login
                </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-2 rounded-md"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="block text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  
                  {isAdmin && (
                    <Link
                      href={`/${routeLocale}/dashboard/admin`}
                      className="block bg-purple-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-purple-700"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                    className="block bg-red-600 text-white px-3 py-2 rounded-md text-base font-medium hover:bg-red-700 w-full text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href={`/${routeLocale}/auth/login`}
                  className="block bg-primary text-primary-foreground px-3 py-2 rounded-md text-base font-medium hover:bg-primary/90 w-full text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
