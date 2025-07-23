import { useState } from 'react';
import { DocumentArrowUpIcon, DocumentIcon, TrashIcon } from '@heroicons/react/24/outline';

interface OrdersTabProps {
  onSubmit: () => void;
}

export default function OrdersTab({ onSubmit }: OrdersTabProps) {
  const [documents, setDocuments] = useState([
    { id: '1', name: 'Dozvil2026-05.doc', type: 'uploaded' }
  ]);

  const orderTypes = [
    {
      title: 'Про призначення відповідальних за організацію і безпечне виконання робіт підвищеної небезпеки',
      required: true
    },
    {
      title: 'Відповідальний за належний стан пожежної безпеки на об\'єкті виконання робіт',
      required: true
    },
    {
      title: 'Відповідальний за належний стан екологічної безпеки на об\'єкті виконання робіт',
      required: true
    },
    {
      title: 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці відповідальних осіб за організацію безпечного виконання робіт підрядником',
      required: true,
      hasDocument: true,
      documentName: 'Dozvil2026-05.doc'
    },
    {
      title: 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці та навчання безпечним методам роботи працівників підрядника',
      required: true
    },
    {
      title: 'Медичні заключення про допуск до виконання робіт за зазначеними професіями',
      required: true
    }
  ];

  const handleFileUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File uploaded:', file.name, 'for order type:', index);
      // Handle file upload logic here
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Додайте завірені копії наступних наказів та посвідчень:
        </p>

        <div className="space-y-6">
          {orderTypes.map((order, index) => (
            <div key={index} className="space-y-3">
              <label className="block text-sm font-medium text-gray-800 leading-relaxed">
                {order.title}
              </label>
              
              {order.hasDocument ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-700">{order.documentName}</span>
                    <button
                      onClick={() => removeDocument('1')}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(index, e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                  <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Додати файл</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(index, e)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
              )}
            </div>
          ))}
        </div>
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