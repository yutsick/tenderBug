// components/CabinetPage.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import CabinetHeader from '@/components/cabinet/CabinetHeader';
import WorksTab from '@/components/cabinet/WorksTab';
import EmployeesTab from '@/components/cabinet/EmployeesTab';
import OrdersTab from '@/components/cabinet/OrdersTab';
import TechnicsTab from '@/components/cabinet/TechnicsTab';
import InstrumentsTab from '@/components/cabinet/InstrumentsTab';
import PPETab from '@/components/cabinet/PPETab';
import SuccessMessage from '@/components/cabinet/SuccessMessage';

export default function CabinetPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('works');
  const [showSuccess, setShowSuccess] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }
  
  if (!user) return null;

  const handleDataSubmit = () => {
    setShowSuccess(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
  };

  if (showSuccess) {
    return <SuccessMessage onClose={handleSuccessClose} />;
  }

  const tabs = [
    { id: 'works', label: 'Роботи', component: WorksTab },
    { id: 'employees', label: 'Співробітники', component: EmployeesTab },
    { id: 'orders', label: 'Накази', component: OrdersTab },
    { id: 'technics', label: 'Техніка', component: TechnicsTab },
    { id: 'instruments', label: 'Інструменти', component: InstrumentsTab },
    { id: 'ppe', label: 'ЗІЗ', component: PPETab },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || WorksTab;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <CabinetHeader user={user} />

        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Tabs Header */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm transition-colors relative
                    ${activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <ActiveComponent onSubmit={handleDataSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
}