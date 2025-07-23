'use client';

import { useState } from 'react';
import { Card, Tabs, message } from 'antd';
import type { TabsProps } from 'antd';
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('works');
  const [showSuccess, setShowSuccess] = useState(false);

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

  const tabItems: TabsProps['items'] = [
    {
      key: 'works',
      label: 'Роботи',
      children: <WorksTab onSubmit={handleDataSubmit} />,
    },
    {
      key: 'employees',
      label: 'Співробітники',
      children: <EmployeesTab onSubmit={handleDataSubmit} />,
    },
    {
      key: 'orders',
      label: 'Накази',
      children: <OrdersTab onSubmit={handleDataSubmit} />,
    },
    {
      key: 'technics',
      label: 'Техніка',
      children: <TechnicsTab onSubmit={handleDataSubmit} />,
    },
    {
      key: 'instruments',
      label: 'Інструменти',
      children: <InstrumentsTab onSubmit={handleDataSubmit} />,
    },
    {
      key: 'ppe',
      label: 'ЗІЗ',
      children: <PPETab onSubmit={handleDataSubmit} />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <CabinetHeader user={user} />
        
        <Card className="mt-6">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            size="large"
            className="cabinet-tabs"
            items={tabItems}
          />
        </Card>
      </div>
    </div>
  );
}