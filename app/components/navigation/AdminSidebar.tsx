'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Calendar,
  Package,
  Coffee,
  Clock,
  DollarSign,
  Tag,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  User,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
  notificationCounts?: {
    bookings?: number;
    analytics?: number;
  };
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  section: string;
  badge?: number;
}

export default function AdminSidebar({ isOpen, onClose, user, notificationCounts }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems: NavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Main' },
    { href: '/admin/bookings', label: 'Bookings', icon: Calendar, section: 'Main', badge: notificationCounts?.bookings },
    { href: '/admin/packages', label: 'Packages', icon: Package, section: 'Management' },
    { href: '/admin/extras', label: 'Extras', icon: Coffee, section: 'Management' },
    { href: '/admin/availability', label: 'Availability', icon: Clock, section: 'Configuration' },
    { href: '/admin/pricing', label: 'Pricing', icon: DollarSign, section: 'Configuration' },
    { href: '/admin/promo-codes', label: 'Promo Codes', icon: Tag, section: 'Configuration' },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, section: 'Reports', badge: notificationCounts?.analytics },
    { href: '/admin/settings', label: 'Settings', icon: Settings, section: 'Configuration' },
  ];

  const sections = ['Main', 'Management', 'Configuration', 'Reports'];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    const showBadge = item.badge && item.badge > 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`
          flex items-center justify-between px-3 py-2 rounded-md transition-colors relative
          ${isActive ? 'active bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}
        `}
        onMouseEnter={() => setHoveredItem(item.label)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div className="flex items-center">
          <Icon size={20} data-testid={`icon-${item.label.toLowerCase().replace(' ', '-')}`} />
          <span className={`ml-3 ${isCollapsed ? 'hidden' : ''}`}>{item.label}</span>
        </div>
        {showBadge && !isCollapsed && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
            {item.badge}
          </span>
        )}
        {isCollapsed && hoveredItem === item.label && (
          <div
            role="tooltip"
            className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded whitespace-nowrap z-50"
          >
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className={`h-full bg-white flex flex-col ${isCollapsed ? 'w-16' : 'w-64'} transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        {!isCollapsed && <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-100 hidden lg:block"
          aria-label="Collapse sidebar"
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        {isOpen && onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav role="navigation" aria-label="Admin navigation" className="flex-1 overflow-y-auto p-4">
        <div data-testid="sidebar-content" className={isCollapsed ? 'w-16' : 'w-64'}>
          {sections.map((section) => {
            const sectionItems = navItems.filter((item) => item.section === section);
            if (sectionItems.length === 0) return null;

            return (
              <div key={section} className="sidebar-section mb-6">
                {!isCollapsed && (
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {section}
                  </h3>
                )}
                <div className="space-y-1">
                  {sectionItems.map(renderNavItem)}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="border-t p-4">
        {user && !isCollapsed && (
          <div className="mb-3">
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              {user.role === 'ADMIN' ? 'Administrator' : 'User'}
            </p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center w-full px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Log out"
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="ml-3">Log Out</span>}
        </button>
      </div>
    </div>
  );

  // Mobile overlay
  if (isOpen) {
    return (
      <>
        <div
          data-testid="mobile-overlay"
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
        <aside className="fixed inset-y-0 left-0 z-50 lg:hidden">
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="hidden lg:block h-full border-r">
      {sidebarContent}
    </aside>
  );
}