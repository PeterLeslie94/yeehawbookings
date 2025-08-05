'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { ChevronDown, User, LogOut, Settings, Calendar } from 'lucide-react';

interface UserMenuProps {
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      // Focus first menu item
      setTimeout(() => {
        const firstMenuItem = menuRef.current?.querySelector('[role="menuitem"]');
        (firstMenuItem as HTMLElement)?.focus();
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: '/' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!menuItems) return;

    const currentIndex = Array.from(menuItems).findIndex(
      (item) => item === document.activeElement
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex === menuItems.length - 1 ? 0 : currentIndex + 1;
      (menuItems[nextIndex] as HTMLElement).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
      (menuItems[prevIndex] as HTMLElement).focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const nextIndex = currentIndex === menuItems.length - 1 ? 0 : currentIndex + 1;
      (menuItems[nextIndex] as HTMLElement).focus();
    }
  };

  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email?.[0]?.toUpperCase() || 'U';
  };

  const displayName = user.name || user.email || 'User';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id="user-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div data-testid="user-avatar" className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
          {user.image ? (
            <Image
              src={user.image}
              alt={displayName}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            getInitials()
          )}
        </div>
        <span className="text-gray-700">{displayName}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-labelledby="user-menu-button"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
        >
          {user.role === 'ADMIN' && (
            <>
              <Link
                href="/admin/dashboard"
                role="menuitem"
                tabIndex={-1}
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings size={16} className="mr-2" />
                Admin Dashboard
              </Link>
              <hr className="my-1" />
            </>
          )}
          <Link
            href="/account/bookings"
            role="menuitem"
            tabIndex={-1}
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Calendar size={16} className="mr-2" />
            My Bookings
          </Link>
          <Link
            href="/account/settings"
            role="menuitem"
            tabIndex={-1}
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <User size={16} className="mr-2" />
            Account Settings
          </Link>
          <hr className="my-1" />
          <button
            role="menuitem"
            tabIndex={-1}
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <LogOut size={16} className="mr-2" />
            {isSigningOut ? 'Signing out...' : 'Log Out'}
          </button>
        </div>
      )}
    </div>
  );
}