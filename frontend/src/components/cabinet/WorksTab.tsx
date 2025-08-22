// src/components/cabinet/WorksTab.tsx - З ПОВНОЮ API ІНТЕГРАЦІЄЮ
import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Alert, Spin, message } from 'antd';
import AddWorkModal from './AddWorkModal';
import { useUserSpecification } from '@/hooks/useUserData';
import { apiClient } from '@/lib/api';

interface Work {
  id: string;
  work_type: string;
  work_type_name: string;
  work_sub_type: string;
  work_sub_type_name: string;
  expiry_date: string;
  permit_file?: string;
  is_expired: boolean;
}

interface WorksTabProps {
  onSubmit: () => void;
}

export default function WorksTab({ onSubmit }: WorksTabProps) {
  // Хук для специфікації
  const {
    specification,
    loading: specLoading,
    saving: specSaving,
    updateSpecification
  } = useUserSpecification();

  // Локальний стейт для специфікації та робіт
  const [specificationType, setSpecificationType] = useState<string>('');
  const [works, setWorks] = useState<Work[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Завантаження існуючих даних при ініціалізації
  useEffect(() => {
    if (specification?.specification_type) {
      setSpecificationType(specification.specification_type);
    }
  }, [specification]);

  // Завантаження робіт користувача
  useEffect(() => {
    const fetchUserWorks = async () => {
      setWorksLoading(true);
      try {
        const response = await apiClient.getUserWorks();
        setWorks(response.data);
      } catch (error) {
        console.error('Помилка завантаження робіт:', error);
        message.error('Не вдалося завантажити роботи');
      } finally {
        setWorksLoading(false);
      }
    };

    fetchUserWorks();
  }, []);

  const addWork = async (newWork: {
    workTypeId: string;
    workTypeName: string;
    permitId: string;
    permitName: string;
    expiryDate: string;
    permitFile?: File;
  }) => {
    try {
      const response = await apiClient.createUserWork({
        work_type: newWork.workTypeId,
        work_sub_type: newWork.permitId,
        expiry_date: newWork.expiryDate,
        permit_file: newWork.permitFile
      });

      setWorks(prev => [...prev, response.data]);
      setIsModalOpen(false);
      message.success('Роботу успішно додано');
    } catch (error) {
      console.error('Помилка створення роботи:', error);
      message.error('Не вдалося додати роботу');
    }
  };

  const removeWork = async (id: string) => {
    try {
      await apiClient.deleteUserWork(id);
      setWorks(works.filter(work => work.id !== id));
      message.success('Роботу видалено');
    } catch (error) {
      console.error('Помилка видалення роботи:', error);
      message.error('Не вдалося видалити роботу');
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      message.warning('Заповніть всі обов\'язкові поля');
      return;
    }

    setSubmitting(true);
    try {
      // Спочатку зберігаємо специфікацію
      await updateSpecification({
        specification_type: specificationType
      });

      message.success('Дані успішно збережено!');
      onSubmit(); // Викликаємо callback для показу Success сторінки
    } catch (error) {
      console.error('Помилка збереження:', error);
      message.error('Не вдалося зберегти дані');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = specificationType.trim() !== '' && works.length > 0;

  // Показуємо loader поки завантажуються дані
  if (specLoading || worksLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Інформаційний блок */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          📋 Роботи підвищеної небезпеки
        </h3>
        <p className="text-sm text-blue-700">
          Спочатку вкажіть тип робіт за специфікацією з додатку договору, потім додайте конкретні роботи підвищеної небезпеки з відповідними дозволами.
        </p>
      </div>

      {/* Показуємо статус збереження */}
      {specification && (
        <Alert
          message="Дані раніше збережені"
          description={`Останнє оновлення: ${new Date(specification.updated_at || '').toLocaleString('uk-UA')}`}
          type="success"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          showIcon
          className="mb-4"
        />
      )}

      {/* Поле специфікації */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип робіт за специфікацією *
          </label>
          <textarea
            placeholder="з додатку договору"
            value={specificationType}
            onChange={(e) => setSpecificationType(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
            rows={3}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Опишіть загальний тип робіт згідно з договором
          </p>
        </div>
      </div>

      {/* Список робіт */}
      {works.length > 0 && (
        <div className="space-y-4">
          {works.map((work) => {
            const isExpired = work.is_expired;
            return (
              <div
                key={work.id}
                className={`bg-white border rounded-lg p-6 relative ${isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
              >
                {isExpired && (
                  <div className="absolute top-2 right-16 flex items-center text-red-600">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    <span className="text-xs font-medium">Термін дії закінчився</span>
                  </div>
                )}

                <button
                  onClick={() => removeWork(work.id!)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Видалити роботу"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>

                <div className="space-y-4 pr-12">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип роботи
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800">
                      {work.work_type_name}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дозвіл
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800">
                        {work.work_sub_type_name}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата завершення дії дозволу
                      </label>
                      <div className={`px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm ${isExpired ? 'text-red-800 font-medium' : 'text-gray-800'
                        }`}>
                        {new Date(work.expiry_date).toLocaleDateString('uk-UA')}
                      </div>
                    </div>
                  </div>

                  {work.permit_file && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Файл дозволу
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="flex-1 text-sm text-gray-700 truncate">
                          {/* Витягуємо назву файлу з URL */}
                          {work.permit_file.split('/').pop()?.split('_').slice(-1)[0] || 'permit_file.pdf'}
                        </span>
                        <a
                          href={work.permit_file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Переглянути
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Заглушка коли немає робіт */}
      {works.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-500 mb-4">
            <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">Ще не додано робіт підвищеної небезпеки</p>
            <p className="text-xs text-gray-400 mt-1">Спочатку заповніть тип робіт за специфікацією</p>
          </div>
        </div>
      )}

      {/* Кнопка додавання нової роботи */}
      <div className="text-center">
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!specificationType.trim()}
          className={`inline-flex items-center px-4 py-2 border-2 border-dashed rounded-md transition-colors ${specificationType.trim()
              ? 'border-green-500 text-green-600 hover:border-green-600 hover:bg-green-50'
              : 'border-gray-300 text-gray-400 cursor-not-allowed'
            }`}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Додати роботу підвищеної небезпеки
        </button>
        {!specificationType.trim() && (
          <p className="text-xs text-gray-500 mt-2">
            Спочатку заповніть тип робіт за специфікацією
          </p>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* Кнопка збереження */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || submitting || specSaving}
          className={`px-8 py-3 rounded-md transition-colors font-medium inline-flex items-center gap-2 ${isFormValid && !submitting && !specSaving
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
          {(submitting || specSaving) && <Spin size="small" />}
          {submitting || specSaving ? 'Збереження...' : `Зберегти дані ${works.length > 0 ? `(специфікація + ${works.length} роботи)` : '(специфікація)'}`}
        </button>

        {!isFormValid && (
          <p className="text-xs text-gray-500 mt-2">
            Заповніть специфікацію та додайте хоча б одну роботу
          </p>
        )}
      </div>

      {/* Модальне вікно додавання роботи */}
      <AddWorkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={addWork}
      />
    </div>
  );
}