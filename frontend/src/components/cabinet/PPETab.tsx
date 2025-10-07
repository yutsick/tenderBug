// src/components/cabinet/PPETab.tsx - З ПОВНОЮ API ІНТЕГРАЦІЄЮ
import { useState, useEffect } from 'react';
import { DocumentArrowUpIcon, DocumentIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Alert, Spin, message, App } from 'antd';
import { useUserPPE } from '@/hooks/useUserData';
import { apiClient } from '@/lib/api';
import type { FileInfo } from '@/types/userdata';

interface PPETabProps {
  onSubmit: () => void;
}

interface LocalPPEDocument extends FileInfo {
  uploading?: boolean;
}

const getFullMediaUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  return `${baseURL}${path}`;
};
export default function PPETab({ onSubmit }: PPETabProps) {
  const { message} = App.useApp();
  // Хук для роботи з API
  const { 
    ppe, 
    loading, 
    saving, 
    updatePPE 
  } = useUserPPE();

  // Локальний стейт
  const [documents, setDocuments] = useState<LocalPPEDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Синхронізація з API даними
  useEffect(() => {
    if (ppe?.documents) {
      setDocuments(ppe.documents.map(doc => ({ ...doc, uploading: false })));
    }
  }, [ppe]);

  const handleFileUpload = async (file: File) => {
    // Додаємо файл в локальний стейт зі статусом завантаження
    const tempDoc: LocalPPEDocument = {
      name: file.name,
      path: '',
      size: file.size,
      uploading: true
    };
    
    setDocuments(prev => [...prev, tempDoc]);

    try {
      // Завантажуємо файл через API
      const uploadResponse = await apiClient.uploadDocument(file, 'ppe');
      
      if (uploadResponse.success && uploadResponse.file_info) {
        // Оновлюємо файл з даними з сервера
        setDocuments(prev => prev.map(doc => 
          doc.uploading && doc.name === file.name 
            ? { ...uploadResponse.file_info!, uploading: false }
            : doc
        ));
        
        message.success('Файл успішно завантажено');
      } else {
        throw new Error(uploadResponse.error || 'Помилка завантаження файлу');
      }
    } catch (error) {
      console.error('Помилка завантаження файлу:', error);
      message.error('Не вдалося завантажити файл');
      
      // Видаляємо файл зі статусом помилки
      setDocuments(prev => prev.filter(doc => !(doc.uploading && doc.name === file.name)));
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Фільтруємо тільки завантажені файли (без uploading статусу)
    const uploadedDocuments = documents.filter(doc => !doc.uploading);
    
    if (uploadedDocuments.length === 0) {
      message.warning('Додайте хоча б один документ ЗІЗ');
      return;
    }

    setSubmitting(true);
    try {
      // Зберігаємо дані ЗІЗ
      await updatePPE({
        documents: uploadedDocuments.map(doc => ({
          name: doc.name,
          path: doc.path,
          size: doc.size
        }))
      });

      message.success('Дані ЗІЗ успішно збережено!');
      onSubmit(); // Викликаємо callback для показу Success сторінки
    } catch (error) {
      console.error('Помилка збереження:', error);
      message.error('Не вдалося зберегти дані');
    } finally {
      setSubmitting(false);
    }
  };

  // Показуємо loader поки завантажуються дані
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Показуємо статус збереження */}
      {ppe?.documents && ppe.documents.length > 0 && (
        <Alert
          message={`Збережено ${ppe.documents.length} документів ЗІЗ`}
          description={`Останнє оновлення: ${new Date(ppe.updated_at || '').toLocaleString('uk-UA')}`}
          type="success"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          showIcon
          className="mb-4"
        />
      )}

      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4 leading-relaxed">
          Копії повірки (випробувань) засобів колективного та індивідуального захисту 
          (страхувальні засоби від падіння з висоти, електроізоляційні засоби, тощо)
        </h3>

        <div className="space-y-4">
          {/* Список завантажених документів */}
          {documents.map((document, index) => (
            <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <DocumentIcon className="w-6 h-6 text-blue-500 flex-shrink-0" />
              
              <div className="flex-1">
                <span className="font-medium text-gray-700 block">{document.name}</span>
                {document.size && (
                  <span className="text-xs text-gray-500">
                    {Math.round(document.size / 1024)} KB
                  </span>
                )}
                {document.uploading && (
                  <div className="flex items-center gap-2 mt-1">
                    <Spin size="small" />
                    <span className="text-xs text-blue-600">Завантаження...</span>
                  </div>
                )}
              </div>

              
              {/* Посилання на перегляд файлу */}
              {document.path && !document.uploading && (
                <a
                  href={getFullMediaUrl(document.path)}  // ✅ Змінено з document.url на getFullMediaUrl(document.path)
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Переглянути
                </a>
              )}

              {/* Кнопка видалення */}
              {!document.uploading && (
                <button
                  onClick={() => removeDocument(index)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Видалити документ"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}

          {/* Кнопка завантаження нового файлу */}
          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors min-h-[48px]">
            <DocumentArrowUpIcon className="w-6 h-6 mr-3 text-gray-400" />
            <span className="text-gray-600 font-medium">Додати документ ЗІЗ</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                  // Очищаємо input для можливості завантаження того ж файлу знову
                  e.target.value = '';
                }
              }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </label>

          {/* Підказка */}
          {documents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-4">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm">Ще не додано документів ЗІЗ</p>
              <p className="text-xs text-gray-400 mt-1">
                Завантажте копії повірки засобів індивідуального захисту
              </p>
            </div>
          )}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Кнопка збереження */}
      <div className="text-center">
        <button 
          onClick={handleSubmit}
          disabled={submitting || saving || documents.filter(doc => !doc.uploading).length === 0}
          className={`px-8 py-3 rounded-md transition-colors font-medium inline-flex items-center gap-2 ${
            !submitting && !saving && documents.filter(doc => !doc.uploading).length > 0
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
        >
          {(submitting || saving) && <Spin size="small" />}
          {submitting || saving ? 'Збереження...' : `Зберегти документи ЗІЗ (${documents.filter(doc => !doc.uploading).length})`}
        </button>
        
        {documents.filter(doc => !doc.uploading).length === 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Додайте хоча б один документ для збереження
          </p>
        )}
      </div>
    </div>
  );
}