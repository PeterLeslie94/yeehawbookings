'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import BaseLayout from './BaseLayout';
import Header from '@/app/components/navigation/Header';
import AdminSidebar from '@/app/components/navigation/AdminSidebar';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import ErrorMessage from '@/app/components/ui/ErrorMessage';
import { Menu, ChevronRight } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  actions?: React.ReactNode;
  quickStats?: Array<{ label: string; value: string }>;
  error?: string;
}

export default function AdminLayout({ 
  children, 
  pageTitle, 
  actions, 
  quickStats,
  error 
}: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push(`/auth/login?callbackUrl=${pathname}`);
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, status, router, pathname]);

  if (status === 'loading') {
    return (
      <BaseLayout isLoading={true}>
        <LoadingSpinner />
      </BaseLayout>
    );
  }

  if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <BaseLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You do not have permission to access this page.</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { href, label };
  });

  return (
    <BaseLayout>
      <div className="admin-layout min-h-screen bg-gray-50">
        <Header />
        
        <div className="admin-grid grid grid-cols-1 lg:grid-cols-[250px_1fr]">
          {/* Sidebar */}
          <AdminSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            user={session?.user}
          />
          
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden fixed bottom-4 right-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>
            
            {/* Breadcrumbs */}
            <nav role="navigation" aria-label="Breadcrumb" className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
              <ol className="flex items-center space-x-2">
                {breadcrumbs.map((crumb, index) => (
                  <li key={crumb.href} className="flex items-center">
                    {index > 0 && <ChevronRight size={16} className="mx-2 text-gray-400" />}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-gray-900 font-medium">{crumb.label}</span>
                    ) : (
                      <a href={crumb.href} className="text-blue-600 hover:text-blue-800">
                        {crumb.label}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            
            {/* Page Header */}
            {(pageTitle || actions) && (
              <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                  {pageTitle && (
                    <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                  )}
                  {actions && (
                    <div className="flex items-center space-x-3">{actions}</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Quick Stats */}
            {quickStats && quickStats.length > 0 && (
              <div className="px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickStats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-6">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <ErrorMessage message={error} />
              </div>
            )}
            
            {/* Main Content */}
            <main className="px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}