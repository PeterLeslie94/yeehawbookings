'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import UserMenu from './UserMenu';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Close mobile menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobileMenuOpen]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/booking', label: 'Book Now' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  if (status === 'loading') {
    return (
      <header className="sticky top-0 z-50 bg-white border-b">
        <div data-testid="header-skeleton" className="h-16 animate-pulse bg-gray-100"></div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-50 bg-white border-b transition-shadow ${hasScrolled ? 'shadow-md' : ''}`}>
      <nav role="navigation" className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.svg"
              alt="Country Days Logo"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="text-xl font-bold text-gray-900">Country Days</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  pathname === link.href ? 'text-blue-600 font-medium active' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {session?.user?.role === 'ADMIN' && (
              <Link
                href="/admin/dashboard"
                className={`text-gray-700 hover:text-blue-600 transition-colors ${
                  pathname.startsWith('/admin') ? 'text-blue-600 font-medium active' : ''
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {session?.user ? (
              <UserMenu user={session.user} />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 mobile-menu-container"
            aria-label="Menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            data-testid="mobile-menu"
            className="md:hidden absolute top-16 left-0 right-0 bg-white border-b shadow-lg mobile-menu-container"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={`mobile-${link.href}`}
                  href={link.href}
                  className={`block px-4 py-2 rounded-md ${
                    pathname === link.href ? 'bg-gray-100 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {session?.user?.role === 'ADMIN' && (
                <Link
                  href="/admin/dashboard"
                  className={`block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 ${
                    pathname.startsWith('/admin') ? 'bg-gray-100 text-blue-600 font-medium' : ''
                  }`}
                >
                  Admin
                </Link>
              )}
              <hr className="my-2" />
              {session?.user ? (
                <div className="px-4 py-2">
                  <p className="text-sm text-gray-600 mb-2">{session.user.email}</p>
                  <Link
                    href="/account/bookings"
                    className="block py-2 text-gray-700 hover:text-blue-600"
                  >
                    My Bookings
                  </Link>
                  <Link
                    href="/account/settings"
                    className="block py-2 text-gray-700 hover:text-blue-600"
                  >
                    Account Settings
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-center"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}