import { useState } from 'react';
import { PlusIcon, TrashIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface Work {
  id: string;
  specification: string;
  description: string;
  permits: string[];
  completionDate: string;
}

interface WorksTabProps {
  onSubmit: () => void;
}

export default function WorksTab({ onSubmit }: WorksTabProps) {
  const [works, setWorks] = useState<Work[]>([
    {
      id: '1',
      specification: '',
      description: 'Роботи підвищеної небезпеки\n\nРоботи на кабельних лініях і діючих електроустановках',
      permits: [],
      completionDate: '2026-09-25'
    }
  ]);

  const addWork = () => {
    const newWork: Work = {
      id: Date.now().toString(),
      specification: '',
      description: '',
      permits: [],
      completionDate: ''
    };
    setWorks([...works, newWork]);
  };

  const removeWork = (id: string) => {
    setWorks(works.filter(work => work.id !== id));
  };

  const updateWork = (id: string, field: keyof Work, value: any) => {
    setWorks(works.map(work => 
      work.id === id ? { ...work, [field]: value } : work
    ));
  };

  const handleFileUpload = (workId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Uploading file:', file.name, 'for work:', workId);
      // Handle file upload logic here
    }
  };

  return (
    <div className="space-y-6">
      {works.map((work, index) => (
        <div key={work.id} className="bg-white border border-gray-200 rounded-lg p-6 relative">
          {works.length > 1 && (
            <button
              onClick={() => removeWork(work.id)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип робіт за специфікацією
              </label>
              <textarea
                placeholder="з додатку договору"
                value={work.specification}
                onChange={(e) => updateWork(work.id, 'specification', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                rows={1}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Роботи підвищеної небезпеки
                </label>
                <textarea
                  value={work.description}
                  onChange={(e) => updateWork(work.id, 'description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дозволи
                </label>
                <div className="space-y-2 mb-4">
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(work.id, e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                  Дата завершення дії
                </label>
                <input
                  type="date"
                  value={work.completionDate}
                  onChange={(e) => updateWork(work.id, 'completionDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="text-center">
        <button 
          onClick={addWork}
          className="inline-flex items-center px-4 py-2 border-2 border-dashed border-green-500 text-green-600 rounded-md hover:border-green-600 hover:bg-green-50 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Додати тип робіт
        </button>
      </div>

      <hr className="border-gray-200" />

      <div className="text-center">
        <button 
          onClick={onSubmit}
          className="px-8 py-3 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors font-medium"
        >
          Надіслати дані
        </button>
      </div>
    </div>
  );
}