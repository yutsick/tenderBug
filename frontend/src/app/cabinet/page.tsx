// app/cabinet/page.tsx
'use client';
import dynamic from 'next/dynamic';

// Динамічний імпорт без SSR
const CabinetPage = dynamic(() => import('@/components/cabinet/CabinetPage'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  ),
});

export default CabinetPage;