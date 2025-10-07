import { useState, useEffect } from 'react';
import { DocumentArrowUpIcon, DocumentIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Spin, message, Input, App } from 'antd';
import { useUserOrders, useOrderTypes } from '@/hooks/useUserData';
import { apiClient } from '@/lib/api';
import type { FileInfo } from '@/types/userdata';

interface OrdersTabProps {
  onSubmit: () => void;
}

interface LocalOrderData {
  order_type: string;
  order_type_display: string;
  custom_title?: string;
  documents: FileInfo[];
  uploading: boolean;
}

interface CustomOrderForm {
  custom_title: string;
  documents: FileInfo[];
  uploading: boolean;
}

interface SavedCustomOrder {
  id: string;
  custom_title: string;
  documents: FileInfo[];
}

export default function OrdersTab({ onSubmit }: OrdersTabProps) {
  const { message } = App.useApp();
  const { orders, loading: ordersLoading, mutating, createOrder, updateOrder, deleteOrder, refetch } = useUserOrders();
  const { orderTypes, loading: typesLoading } = useOrderTypes();

  const [localOrders, setLocalOrders] = useState<Record<string, LocalOrderData>>({});
  const [customOrderForm, setCustomOrderForm] = useState<CustomOrderForm>({
    custom_title: '',
    documents: [],
    uploading: false
  });
  const [savedCustomOrders, setSavedCustomOrders] = useState<SavedCustomOrder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<string | null>(null);

  const defaultOrderTypes = [
    { value: 'responsible_person', label: 'Про призначення відповідальних за організацію і безпечне виконання робіт підвищеної небезпеки' },
    { value: 'fire_safety', label: 'Відповідальний за належний стан пожежної безпеки на об\'єкті виконання робіт' },
    { value: 'eco_safety', label: 'Відповідальний за належний стан екологічної безпеки на об\'єкті виконання робіт' },
    { value: 'certificates_protocols', label: 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці відповідальних осіб за організацію безпечного виконання робіт підрядником' },
    { value: 'worker_training', label: 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці та навчання безпечним методам роботи працівників підрядника' },
    { value: 'medical_conclusions', label: 'Медичні заключення про допуск до виконання робіт за зазначеними професіями' }
  ];

  const availableOrderTypes = orderTypes.length > 0 ? orderTypes : defaultOrderTypes;

  const getFullMediaUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    return `${baseURL}${path}`;
  };

  // Ініціалізація + СИНХРОНІЗАЦІЯ з сервером
  useEffect(() => {
    const initialFixedState: Record<string, LocalOrderData> = {};
    const customOrdersFromAPI: SavedCustomOrder[] = [];

    // Фіксовані типи - беремо ОСТАННІЙ (найновіший) наказ кожного типу
    availableOrderTypes.forEach(type => {
      // Знаходимо ВСІ накази цього типу
      const ordersOfType = Array.isArray(orders) 
        ? orders.filter(order => order.order_type === type.value && order.order_type !== 'custom')
        : [];
      
      // Беремо останній (з найбільшим ID або найновішою датою)
      const latestOrder = ordersOfType.length > 0 
        ? ordersOfType.reduce((latest, current) => {
            const currentDate = new Date(current.created_at || 0);
            const latestDate = new Date(latest.created_at || 0);
            return currentDate > latestDate ? current : latest;
          })
        : null;

      initialFixedState[type.value] = {
        order_type: type.value,
        order_type_display: type.label,
        documents: latestOrder?.documents_info || latestOrder?.documents || [],
        uploading: false
      };
    });

    // Кастомні накази
    if (Array.isArray(orders)) {
      const customOrdersFromServer = orders.filter(order => order.order_type === 'custom');
      customOrdersFromServer.forEach((order, index) => {
        customOrdersFromAPI.push({
          id: order.id || `existing_${index}`,
          custom_title: order.custom_title || `Кастомний наказ ${index + 1}`,
          documents: order.documents_info || order.documents || []
        });
      });
    }

    setLocalOrders(initialFixedState);
    setSavedCustomOrders(customOrdersFromAPI);
  }, [orders, availableOrderTypes]);

  const clearCustomOrderForm = () => {
    setCustomOrderForm({
      custom_title: '',
      documents: [],
      uploading: false
    });
  };

  const deleteSavedCustomOrder = async (customOrderId: string) => {
    try {
      await deleteOrder(customOrderId);
      await refetch();
      message.success('Кастомний наказ видалено');
    } catch (error) {
      console.error('Помилка видалення кастомного наказу:', error);
      message.error('Не вдалося видалити наказ');
    }
  };

  const removeFileFromSavedCustomOrder = async (customOrderId: string, fileIndex: number) => {
    try {
      const customOrder = savedCustomOrders.find(order => order.id === customOrderId);
      if (!customOrder) return;

      const updatedDocuments = customOrder.documents.filter((_, index) => index !== fileIndex);

      await updateOrder(customOrderId, {
        order_type: 'custom',
        custom_title: customOrder.custom_title,
        documents: updatedDocuments
      });

      await refetch();
      message.success('Файл видалено');
    } catch (error) {
      console.error('Помилка видалення файлу:', error);
      message.error('Не вдалося видалити файл');
    }
  };

  const updateCustomFormTitle = (title: string) => {
    setCustomOrderForm(prev => ({ ...prev, custom_title: title }));
  };

  const handleFileUpload = async (orderKey: string, file: File, isCustomForm = false) => {
    if (isCustomForm) {
      setCustomOrderForm(prev => ({ ...prev, uploading: true }));
    } else {
      setLocalOrders(prev => ({
        ...prev,
        [orderKey]: { ...prev[orderKey], uploading: true }
      }));
    }

    try {
      const uploadResponse = await apiClient.uploadDocument(file, `order_${orderKey}`);

      if (uploadResponse.success && uploadResponse.file_info) {
        if (isCustomForm) {
          setCustomOrderForm(prev => ({
            ...prev,
            documents: [...prev.documents, uploadResponse.file_info!],
            uploading: false
          }));
        } else {
          setLocalOrders(prev => ({
            ...prev,
            [orderKey]: {
              ...prev[orderKey],
              documents: [...prev[orderKey].documents, uploadResponse.file_info!],
              uploading: false
            }
          }));
        }
        message.success('Файл успішно завантажено');
      } else {
        throw new Error(uploadResponse.error || 'Помилка завантаження');
      }
    } catch (error) {
      console.error('Помилка завантаження:', error);
      message.error('Не вдалося завантажити файл');

      if (isCustomForm) {
        setCustomOrderForm(prev => ({ ...prev, uploading: false }));
      } else {
        setLocalOrders(prev => ({
          ...prev,
          [orderKey]: { ...prev[orderKey], uploading: false }
        }));
      }
    }
  };

  const removeDocument = async (orderKey: string, docIndex: number, isCustomForm = false) => {
    if (isCustomForm) {
      setCustomOrderForm(prev => ({
        ...prev,
        documents: prev.documents.filter((_, index) => index !== docIndex)
      }));
    } else {
      const documentKey = `${orderKey}-${docIndex}`;
      setDeletingDocument(documentKey);

      const updatedDocuments = localOrders[orderKey].documents.filter((_, index) => index !== docIndex);
      
      setLocalOrders(prev => ({
        ...prev,
        [orderKey]: {
          ...prev[orderKey],
          documents: updatedDocuments
        }
      }));

      const ordersOfType = Array.isArray(orders) 
        ? orders.filter(order => order.order_type === orderKey && order.order_type !== 'custom')
        : [];

      if (ordersOfType.length > 0) {
        const latestOrder = ordersOfType.reduce((latest, current) => {
          const currentDate = new Date(current.created_at || 0);
          const latestDate = new Date(latest.created_at || 0);
          return currentDate > latestDate ? current : latest;
        });

        try {
          await updateOrder(latestOrder.id!, {
            order_type: orderKey,
            documents: updatedDocuments
          });
          message.success('Файл видалено');
        } catch (error) {
          console.error('Помилка видалення файлу з серверу:', error);
          message.error('Не вдалося видалити файл');
          
          setLocalOrders(prev => ({
            ...prev,
            [orderKey]: {
              ...prev[orderKey],
              documents: [...prev[orderKey].documents, localOrders[orderKey].documents[docIndex]]
            }
          }));
        } finally {
          setDeletingDocument(null);
        }
      } else {
        message.success('Файл видалено');
        setDeletingDocument(null);
      }
    }
  };

  const handleSubmit = async () => {
    const fixedOrdersToSave = Object.entries(localOrders)
      .filter(([_, orderData]) => orderData.documents.length > 0);

    const hasCustomFormData = customOrderForm.documents.length > 0 && customOrderForm.custom_title.trim();

    if (fixedOrdersToSave.length === 0 && !hasCustomFormData) {
      message.warning('Додайте документи хоча б для одного типу наказу');
      return;
    }

    setSubmitting(true);
    try {
      for (const [orderType, orderData] of fixedOrdersToSave) {
        const ordersOfType = Array.isArray(orders) 
          ? orders.filter(order => order.order_type === orderType && order.order_type !== 'custom')
          : [];

        if (ordersOfType.length > 0) {
          const latestOrder = ordersOfType.reduce((latest, current) => {
            const currentDate = new Date(current.created_at || 0);
            const latestDate = new Date(latest.created_at || 0);
            return currentDate > latestDate ? current : latest;
          });

          await updateOrder(latestOrder.id!, {
            order_type: orderData.order_type,
            documents: orderData.documents
          });
        } else {
          await createOrder({
            order_type: orderData.order_type,
            documents: orderData.documents
          });
        }
      }

      if (hasCustomFormData) {
        const result = await createOrder({
          order_type: 'custom',
          custom_title: customOrderForm.custom_title.trim(),
          documents: customOrderForm.documents
        });

        const newSavedOrder: SavedCustomOrder = {
          id: result?.id || `new_${Date.now()}`,
          custom_title: customOrderForm.custom_title.trim(),
          documents: customOrderForm.documents
        };
        setSavedCustomOrders(prev => [...prev, newSavedOrder]);
        clearCustomOrderForm();
      }

      await refetch();
      message.success('Всі накази успішно збережено!');
      onSubmit();
    } catch (error) {
      console.error('Помилка збереження:', error);
      message.error('Не вдалося зберегти всі дані');
    } finally {
      setSubmitting(false);
    }
  };

  if (ordersLoading || typesLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-600 mb-6 leading-relaxed">
        Додайте завірені копії наступних наказів та посвідчень:
      </p>

      {/* ФІКСОВАНІ ТИПИ НАКАЗІВ */}
      <div className="space-y-8 mb-8">
        {availableOrderTypes.map((orderType) => {
          const orderData = localOrders[orderType.value];
          const ordersOfType = Array.isArray(orders) 
            ? orders.filter(order => order.order_type === orderType.value && order.order_type !== 'custom')
            : [];
          const existingOrder = ordersOfType.length > 0;

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

              {orderData.documents.length > 0 && (
                <div className="space-y-2 mb-4">
                  {orderData.documents.map((document, docIndex) => {
                    const documentKey = `${orderType.value}-${docIndex}`;
                    const isDeleting = deletingDocument === documentKey;
                    
                    return (
                      <div key={docIndex} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-700 truncate">{document.name}</span>
                        {document.size && (
                          <span className="text-xs text-gray-500">{Math.round(document.size / 1024)} KB</span>
                        )}
                        {document.path && (
                          <a href={getFullMediaUrl(document.path)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800">
                            Переглянути
                          </a>
                        )}
                        <button 
                          onClick={() => removeDocument(orderType.value, docIndex, false)} 
                          disabled={isDeleting}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? <Spin size="small" /> : <TrashIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <label className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                <span className="text-sm text-gray-600">{orderData.uploading ? 'Завантаження...' : 'Додати файл'}</span>
                <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(orderType.value, file, false); }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={orderData.uploading} />
              </label>

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

      {/* ЗБЕРЕЖЕНІ КАСТОМНІ НАКАЗИ */}
      {savedCustomOrders.length > 0 && (
        <div className="border-t border-gray-200 pt-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Збережені кастомні накази</h3>
          <div className="space-y-4">
            {savedCustomOrders.map((savedOrder) => (
              <div key={savedOrder.id} className="border border-green-200 rounded-lg p-4 bg-green-50/30">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex-1 pr-4">{savedOrder.custom_title}</h4>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" title="Збережено" />
                    <button onClick={() => deleteSavedCustomOrder(savedOrder.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Видалити наказ">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {savedOrder.documents.length > 0 && (
                  <div className="space-y-2">
                    {savedOrder.documents.map((document, docIndex) => (
                      <div key={docIndex} className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-md">
                        <DocumentIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-700 truncate">{document.name}</span>
                        {document.size && <span className="text-xs text-gray-500">{Math.round(document.size / 1024)} KB</span>}
                        {document.path && (
                          <a href={getFullMediaUrl(document.path)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800">
                            Переглянути
                          </a>
                        )}
                        <button onClick={() => removeFileFromSavedCustomOrder(savedOrder.id, docIndex)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ФОРМА НОВОГО КАСТОМНОГО НАКАЗУ */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Додати інший наказ</h3>
        <div className="border border-gray-200 rounded-lg p-6 bg-blue-50/30">
          <div className="mb-4">
            <Input placeholder="Введіть назву наказу..." value={customOrderForm.custom_title} onChange={(e) => updateCustomFormTitle(e.target.value)} className="mb-2" maxLength={500} />
            <p className="text-xs text-gray-500">Наприклад: "Про призначення відповідальних за контроль якості робіт"</p>
          </div>

          {customOrderForm.documents.length > 0 && (
            <div className="space-y-2 mb-4">
              {customOrderForm.documents.map((document, docIndex) => (
                <div key={docIndex} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-md">
                  <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{document.name}</span>
                  {document.size && <span className="text-xs text-gray-500">{Math.round(document.size / 1024)} KB</span>}
                  <button onClick={() => removeDocument('custom_form', docIndex, true)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
            <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
            <span className="text-sm text-gray-600">{customOrderForm.uploading ? 'Завантаження...' : 'Додати файл'}</span>
            <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload('custom_form', file, true); }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={customOrderForm.uploading} />
          </label>

          {customOrderForm.uploading && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
              <Spin size="small" />
              Завантаження файлу...
            </div>
          )}
        </div>
      </div>

      <hr className="border-gray-200" />

      <div className="text-center">
        <button onClick={handleSubmit} disabled={submitting || mutating} className={`px-8 py-3 rounded-md transition-colors font-medium inline-flex items-center gap-2 ${!submitting && !mutating ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-400 text-white cursor-not-allowed'}`}>
          {(submitting || mutating) && <Spin size="small" />}
          {submitting || mutating ? 'Збереження...' : 'Зберегти всі накази'}
        </button>
      </div>
    </div>
  );
}