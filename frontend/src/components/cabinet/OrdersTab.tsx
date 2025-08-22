// src/components/cabinet/OrdersTab.tsx - З ПОВНОЮ API ІН// src/components/cabinet/OrdersTab.tsx - З ПОВНОЮ API ІНТЕГРАЦІЄЮ
import { useState, useEffect } from 'react';
import { DocumentArrowUpIcon, DocumentIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Alert, Spin, message, Upload, Button } from 'antd';
import { useUserOrders, useOrderTypes } from '@/hooks/useUserData';
import { apiClient } from '@/lib/api';
import type { FileInfo } from '@/types/userdata';

interface OrdersTabProps {
  onSubmit: () => void;
}

interface LocalOrderData {
  order_type: string;
  order_type_display: string;
  documents: FileInfo[];
  uploading: boolean;
}

export default function OrdersTab({ onSubmit }: OrdersTabProps) {
  // Хуки для роботи з API
  const { orders, loading: ordersLoading, mutating, createOrder, updateOrder } = useUserOrders();
  const { orderTypes, loading: typesLoading } = useOrderTypes();

  // Локальний стейт
  const [localOrders, setLocalOrders] = useState<Record<string, LocalOrderData>>({});
  const [submitting, setSubmitting] = useState(false);

  // Предвизначені типи наказів
  const defaultOrderTypes = [
    {
      value: 'safety_responsible',
      label: 'Про призначення відповідальних за організацію і безпечне виконання робіт підвищеної небезпеки'
    },
    {
      value: 'fire_safety_responsible', 
      label: 'Відповідальний за належний стан пожежної безпеки на об\'єкті виконання робіт'
    },
    {
      value: 'environmental_responsible',
      label: 'Відповідальний за належний стан екологічної безпеки на об\'єкті виконання робіт'
    },
    {
      value: 'qualification_certificates',
      label: 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці відповідальних осіб за організацію безпечного виконання робіт підрядником'
    },
    {
      value: 'worker_certificates',
      label: 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці та навчання безпечним методам роботи працівників підрядника'
    },
    {
      value: 'medical_certificates',
      label: 'Медичні заключення про допуск до виконання робіт за зазначеними професіями'
    }
  ];

  // Використовуємо типи з API або fallback до дефолтних
  const availableOrderTypes = orderTypes.length > 0 ? orderTypes : defaultOrderTypes;

  // Ініціалізація локального стейту
  useEffect(() => {
    const initialState: Record<string, LocalOrderData> = {};
    
    availableOrderTypes.forEach(type => {
      const existingOrder = Array.isArray(orders) ? orders.find(order => order.order_type === type.value) : null;
      
      initialState[type.value] = {
        order_type: type.value,
        order_type_display: type.label,
        documents: existingOrder?.documents_info || existingOrder?.documents || [],
        uploading: false
      };
    });

    setLocalOrders(initialState);
  }, [orders, availableOrderTypes]);

  const handleFileUpload = async (orderType: string, file: File) => {
    // Додаємо файл в локальний стейт зі статусом завантаження
    setLocalOrders(prev => ({
      ...(prev || {}),  // Захист від undefined
      [orderType]: {
        ...(prev?.[orderType] || {}),  // Захист від undefined
        uploading: true
      }
    }));

    try {
      // Завантажуємо файл через API
      const uploadResponse = await apiClient.uploadDocument(file, `order_${orderType}`);
      
      if (uploadResponse.success && uploadResponse.file_info) {
        // Додаємо файл до локального стейту
        setLocalOrders(prev => ({
          ...prev,
          [orderType]: {
            ...prev[orderType],
            documents: [...prev[orderType].documents, uploadResponse.file_info!],
            uploading: false
          }
        }));
        
        message.success('Файл успішно завантажено');
      } else {
        throw new Error(uploadResponse.error || 'Помилка завантаження файлу');
      }
    } catch (error) {
      console.error('Помилка завантаження файлу:', error);
      message.error('Не вдалося завантажити файл');
      
      setLocalOrders(prev => ({
        ...(prev || {}),  // Захист від undefined
        [orderType]: {
          ...(prev?.[orderType] || {}),  // Захист від undefined
          uploading: false
        }
      }));
    }
  };

  const removeDocument = (orderType: string, docIndex: number) => {
    setLocalOrders(prev => ({
      ...(prev || {}),  // Захист від undefined
      [orderType]: {
        ...(prev?.[orderType] || {}),  // Захист від undefined
        documents: (prev?.[orderType]?.documents || []).filter((_, index) => index !== docIndex)
      }
    }));
  };

  const saveOrderType = async (orderType: string) => {
    const orderData = localOrders[orderType];
    
    if (orderData.documents.length === 0) {
      message.warning('Додайте хоча б один документ');
      return;
    }

    try {
      // ЗАВЖДИ створюємо новий наказ (без перевірки на існуючий)
      await createOrder({
        order_type: orderType,
        documents: orderData.documents
      });
      message.success('Наказ збережено');
    } catch (error) {
      console.error('Помилка збереження наказу:', error);
      message.error('Не вдалося зберегти наказ');
    }
  };

  const handleSubmit = async () => {
    // Перевіряємо, чи є документи хоча б в одному типі наказу
    const hasAnyDocuments = Object.values(localOrders).some(order => order.documents.length > 0);
    
    if (!hasAnyDocuments) {
      message.warning('Додайте документи хоча б для одного типу наказу');
      return;
    }

    setSubmitting(true);
    try {
      // Зберігаємо всі накази з документами
      const ordersToSave = Object.entries(localOrders)
        .filter(([_, orderData]) => orderData.documents.length > 0)
        .map(([orderType, orderData]) => ({
          order_type: orderType,
          documents: orderData.documents
        }));

      for (const orderData of ordersToSave) {
        // ЗАВЖДИ створюємо новий наказ
        await createOrder(orderData);
      }

      message.success('Всі накази успішно збережено!');
      onSubmit(); // Викликаємо callback для показу Success сторінки
    } catch (error) {
      console.error('Помилка збереження:', error);
      message.error('Не вдалося зберегти всі дані');
    } finally {
      setSubmitting(false);
    }
  };

  // Показуємо loader поки завантажуються дані
  if (ordersLoading || typesLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Показуємо статус збереження */}
      {Array.isArray(orders) && orders.length > 0 && (
        <Alert
          message={`Збережено ${orders.length} типів наказів`}
          description="Дані синхронізовані з сервером"
          type="success"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          showIcon
          className="mb-4"
        />
      )}

      <div>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Додайте завірені копії наступних наказів та посвідчень:
        </p>

        <div className="space-y-8">
          {availableOrderTypes.map((orderType, index) => {
            const orderData = localOrders[orderType.value];
            const existingOrder = Array.isArray(orders) ? orders.find(order => order.order_type === orderType.value) : null;
            
            if (!orderData) return null;

            return (
              <div key={orderType.value} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-800 leading-relaxed flex-1 pr-4">
                    {orderType.label}
                  </label>
                  
                  {existingOrder && (
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" title="Збережено" />
                  )}
                </div>
                
                {/* Список завантажених документів */}
                {orderData.documents.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {orderData.documents.map((document, docIndex) => (
                      <div key={docIndex} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-700 truncate">{document.name}</span>
                        {document.size && (
                          <span className="text-xs text-gray-500">
                            {Math.round(document.size / 1024)} KB
                          </span>
                        )}
                        <button
                          onClick={() => removeDocument(orderType.value, docIndex)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Кнопка завантаження файлу */}
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {orderData.uploading ? 'Завантаження...' : 'Додати файл'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(orderType.value, file);
                        }
                      }}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={orderData.uploading}
                    />
                  </label>

                  {/* Кнопка швидкого збереження */}
                  {orderData.documents.length > 0 && !existingOrder && (
                    <Button
                      onClick={() => saveOrderType(orderType.value)}
                      loading={mutating}
                      type="primary"
                      size="small"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Зберегти
                    </Button>
                  )}
                </div>

                {orderData.uploading && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                    <Spin size="small" />
                    Завантаження файлу...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Кнопка збереження всіх даних */}
      <div className="text-center">
        <button 
          onClick={handleSubmit}
          disabled={submitting || mutating}
          className={`px-8 py-3 rounded-md transition-colors font-medium inline-flex items-center gap-2 ${
            !submitting && !mutating
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
        >
          {(submitting || mutating) && <Spin size="small" />}
          {submitting || mutating ? 'Збереження...' : 'Зберегти всі накази'}
        </button>
      </div>
    </div>
  );
}