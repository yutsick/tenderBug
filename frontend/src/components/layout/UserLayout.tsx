'use client';

import { useState } from 'react';
import { 
  UserIcon, 
  ArrowRightOnRectangleIcon,
  HomeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Помилка при виході:', error);
    } finally {
      logout();
      router.push('/login');
    }
  };

  const menuItems = [
    {
      key: 'cabinet',
      icon: HomeIcon,
      label: 'Кабінет',
      path: '/cabinet'
    },
    // {
    //   key: 'documents',
    //   icon: DocumentTextIcon,
    //   label: 'Документи',
    //   path: '/cabinet/documents'
    // },
    {
      key: 'status',
      icon: CheckCircleIcon,
      label: 'Статус заявки',
      path: '/cabinet/status'
    }
  ];

  const getSelectedKey = () => {
    if (pathname === '/cabinet') return 'cabinet';
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/status')) return 'status';
    return 'cabinet';
  };

  const getPageTitle = () => {
    if (pathname.includes('/documents')) return 'Документи';
    if (pathname.includes('/status')) return 'Статус заявки';
    return 'Особистий кабінет';
  };

  const getCompanyName = () => {
    if (user?.company_name) {
      return user.company_name.length > 30 
        ? `${user.company_name.substring(0, 30)}...` 
        : user.company_name;
    }
    return user?.email || 'Користувач';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo/Brand */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center text-white font-bold text-sm">
              ЗБ
            </div>
            {!collapsed && (
              <h2 className="text-lg font-medium text-green-600 whitespace-nowrap">
                Західний Буг
              </h2>
            )}
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="mt-4 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = getSelectedKey() === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors mb-1
                  ${isActive 
                    ? 'bg-green-50 text-green-700 border-r-2 border-green-600' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info in Sidebar */}
        {!collapsed && user && (
          <div className="fixed w-56 bottom-4 left-4 right-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900 truncate">
                  {getCompanyName()}
                </div>
                <div className="text-xs text-gray-500">
                  {user.department_name}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                {collapsed ? (
                  <Bars3Icon className="w-5 h-5" />
                ) : (
                  <ChevronLeftIcon className="w-5 h-5" />
                )}
              </button>
              
              <h1 className="text-2xl font-semibold text-gray-900">
                {getPageTitle()}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {user.contact_person || 'Користувач'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.email}
                  </div>
                </div>
              )}
              
              {/* User Avatar with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white hover:bg-green-700 transition-colors"
                >
                  <UserIcon className="w-5 h-5" />
                </button>
                
                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <UserIcon className="w-4 h-4" />
                      Профіль
                    </button>
                    <button
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                      Налаштування
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      Вихід
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for dropdown */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
}