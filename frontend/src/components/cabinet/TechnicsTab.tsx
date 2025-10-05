// src/components/cabinet/TechnicsTab.tsx - З ПОВНОЮ API ІНТЕГРАЦІЄЮ
import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, DocumentArrowUpIcon, CheckCircleIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { Alert, Spin, message, Modal, Select, Input, DatePicker } from 'antd';
import { useUserTechnics, useTechnicTypes } from '@/hooks/useUserData';
import { apiClient } from '@/lib/api';
import type { TechnicFormData, DocumentsCollection, FileInfo, RequiredDocument } from '@/types/userdata';

const { Option } = Select;
const { TextArea } = Input;

interface TechnicsTabProps {
  onSubmit: () => void;
}

export default function TechnicsTab({ onSubmit }: TechnicsTabProps) {
  // Хуки для роботи з API
  const {
    technics,
    loading: technicsLoading,
    mutating,
    createTechnic,
    updateTechnic,
    deleteTechnic
  } = useUserTechnics();

  const { technicTypes, loading: typesLoading } = useTechnicTypes();

  // Локальний стейт
  const [localTechnics, setLocalTechnics] = useState<TechnicFormData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [tempFile, setTempFile] = useState<{
    techIndex: number;
    docType: string;
    file: File;
  } | null>(null);

  // Синхронізація з API даними
  useEffect(() => {
    if (technics.length > 0) {
      const converted = technics.map(tech => ({
        id: tech.id,
        type: tech.technic_type || 'custom',
        customType: tech.custom_type || '',
        registrationNumber: tech.registration_number || '',
        description: tech.display_name || '',
        documents: convertDocumentsToFormData(tech.documents),
        expanded: false
      }));
      setLocalTechnics(converted);
    } else {
      // Якщо немає збережених, додаємо один порожній
      setLocalTechnics([{
        id: undefined,
        type: '',
        customType: '',
        documents: {},
        expanded: true
      }]);
    }
  }, [technics]);

  // Конвертуємо документи з API формату в форм дату
  const convertDocumentsToFormData = (docs: DocumentsCollection): { [key: string]: TechnicDocument[] } => {
    const result: { [key: string]: TechnicDocument[] } = {};
    const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

    Object.entries(docs).forEach(([docType, files]) => {
      result[docType] = files.map(fileInfo => {
        const mockFile = new File([''], fileInfo.name, { type: 'application/octet-stream' });
        const fullUrl = fileInfo.path?.startsWith('http')
          ? fileInfo.path
          : `${baseURL}${fileInfo.path}`;

        (mockFile as any).url = fullUrl;

        return {
          file: mockFile,
          expiryDate: fileInfo.expiry_date // ✅ Додаємо термін дії
        };
      });
    });
    return result;
  };

  // Конвертуємо форм дату в API формат
  const convertFormDataToDocuments = (formDocs: { [key: string]: TechnicDocument[] }): DocumentsCollection => {
    const result: DocumentsCollection = {};

    Object.entries(formDocs).forEach(([docType, documents]) => {
      result[docType] = documents.map(docItem => ({
        name: docItem.file.name,
        path: (docItem.file as any).url || '',
        size: docItem.file.size,
        expiry_date: docItem.expiryDate // ✅ Додаємо термін дії
      }));
    });

    return result;
  };

  const addTechnic = () => {
    const newTechnic: TechnicFormData = {
      id: undefined,
      type: '',
      customType: '',
      documents: {},
      expanded: true
    };
    setLocalTechnics([...localTechnics, newTechnic]);
  };

  const removeTechnic = async (index: number) => {
    const technic = localTechnics[index];

    if (technic.id) {
      try {
        await deleteTechnic(technic.id);
        message.success('Техніку видалено');
      } catch (error) {
        console.error('Помилка видалення техніки:', error);
        message.error('Не вдалося видалити техніку');
        return;
      }
    }

    setLocalTechnics(localTechnics.filter((_, i) => i !== index));
  };

  const toggleTechnic = (index: number) => {
    setLocalTechnics(localTechnics.map((tech, i) =>
      i === index ? { ...tech, expanded: !tech.expanded } : tech
    ));
  };

  const updateLocalTechnic = (index: number, field: keyof TechnicFormData, value: any) => {
    setLocalTechnics(localTechnics.map((tech, i) =>
      i === index ? { ...tech, [field]: value } : tech
    ));
  };

  const handleFileUpload = async (
    techIndex: number,
    docType: string,
    file: File,
    expiryDate?: string
  ) => {
    try {
      const uploadResponse = await apiClient.uploadDocument(file, `technic_${docType}`);

      if (uploadResponse.success && uploadResponse.file_info) {
        const docItem: TechnicDocument = {
          file: file,
          expiryDate: expiryDate,
          name: file.name
        };

        (docItem.file as any).url = uploadResponse.file_info.path;

        setLocalTechnics(prev => prev.map((tech, i) => {
          if (i === techIndex) {
            const updatedDocs = { ...tech.documents };
            if (!updatedDocs[docType]) {
              updatedDocs[docType] = [];
            }
            updatedDocs[docType] = [...updatedDocs[docType], docItem];
            return { ...tech, documents: updatedDocs };
          }
          return tech;
        }));

        message.success('Файл успішно завантажено');
      }
    } catch (error) {
      message.error('Не вдалося завантажити файл');
    }
  };

  const removeDocument = (techIndex: number, docType: string, fileIndex: number) => {
    setLocalTechnics(prev => prev.map((tech, i) => {
      if (i === techIndex) {
        const updatedDocs = { ...tech.documents };
        if (updatedDocs[docType]) {
          updatedDocs[docType] = updatedDocs[docType].filter((_, idx) => idx !== fileIndex);
          if (updatedDocs[docType].length === 0) {
            delete updatedDocs[docType];
          }
        }
        return { ...tech, documents: updatedDocs };
      }
      return tech;
    }));
  };

  const saveTechnic = async (index: number) => {
    const technic = localTechnics[index];

    // Валідація
    if (!technic.type && !technic.customType) {
      message.warning('Виберіть або введіть тип техніки');
      return;
    }
    if (technic.type !== 'tower_crane' && !technic.registrationNumber?.trim()) {
      message.warning('Введіть реєстраційний номер');
      return;
    }

    try {
      const technicData = {
        technic_type: technic.type === 'custom' ? undefined : technic.type,
        custom_type: technic.type === 'custom' ? technic.customType : undefined,
        registration_number: technic.registrationNumber,
        documents: convertFormDataToDocuments(technic.documents)
      };

      if (technic.id) {
        // Оновлення існуючої
        await updateTechnic(technic.id, technicData);
        message.success('Дані техніки оновлено');
      } else {
        // Створення нової
        const newTech = await createTechnic(technicData);
        // Оновлюємо локальний стейт з ID з сервера
        setLocalTechnics(prev => prev.map((tech, i) =>
          i === index ? { ...tech, id: newTech.id } : tech
        ));
        message.success('Техніку додано');
      }
    } catch (error) {
      console.error('Помилка збереження техніки:', error);
      message.error('Не вдалося зберегти дані техніки');
    }
  };

  const handleSubmit = async () => {
    if (localTechnics.length === 0) {
      message.warning('Додайте хоча б одну техніку');
      return;
    }

    const invalidTechnics = localTechnics.filter(tech => !tech.type && !tech.customType);
    if (invalidTechnics.length > 0) {
      message.warning('Заповніть типи всієї техніки');
      return;
    }

    setSubmitting(true);
    try {
      // ✅ СТВОРЮЄМО нову техніку
      const unsavedTechnics = localTechnics.filter(tech => !tech.id);
      for (const technic of unsavedTechnics) {
        const technicData = {
          technic_type: technic.type === 'custom' ? undefined : technic.type,
          custom_type: technic.type === 'custom' ? technic.customType : undefined,
          registration_number: technic.registrationNumber,
          documents: convertFormDataToDocuments(technic.documents)
        };
        await createTechnic(technicData);
      }

      // ✅ ОНОВЛЮЄМО існуючу техніку
      const existingTechnics = localTechnics.filter(tech => tech.id);
      for (const technic of existingTechnics) {
        const technicData = {
          technic_type: technic.type === 'custom' ? undefined : technic.type,
          custom_type: technic.type === 'custom' ? technic.customType : undefined,
          registration_number: technic.registrationNumber,
          documents: convertFormDataToDocuments(technic.documents)
        };
        await updateTechnic(technic.id!, technicData);
      }

      message.success('Всі дані техніки збережено!');
      onSubmit();
    } catch (error) {
      console.error('Помилка збереження:', error);
      message.error('Не вдалося зберегти дані');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (index: number) => {
    const technic = localTechnics[index];
    Modal.confirm({
      title: 'Видалення техніки',
      content: `Ви впевнені, що хочете видалити цю техніку?`,
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: () => removeTechnic(index)
    });
  };

  // Отримуємо необхідні документи для вибраного типу техніки
  const getRequiredDocuments = (technicType: string): RequiredDocument[] => {
    if (technicType === 'custom' || !technicType) return [];
    const type = technicTypes.find(t => t.id === technicType);
    return type?.required_documents || [];
  };

  // Показуємо loader поки завантажуються дані
  if (technicsLoading || typesLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Показуємо статус збереження */}
      {technics.length > 0 && (
        <Alert
          message={`Збережено ${technics.length} одиниць техніки`}
          description="Дані синхронізовані з сервером"
          type="success"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          showIcon
          className="mb-4"
        />
      )}

      {localTechnics.map((technic, index) => {
        const requiredDocuments = getRequiredDocuments(technic.type);

        return (
          <div key={index} className="bg-white border border-gray-200 rounded-lg relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleTechnic(index)}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                  {technic.expanded ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </button>
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      Техніка #{index + 1}
                      {technic.id && (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" title="Збережено" />
                      )}
                    </h3>
                    {technic.type && (
                      <p className="text-sm text-gray-600">
                        {technic.type === 'custom' ? technic.customType :
                          technicTypes.find(t => t.id === technic.type)?.name || technic.type}
                      </p>
                    )}
                  </div>

                  {/* Кнопка швидкого збереження */}
                  {!technic.id && (technic.type || technic.customType) && (
                    <button
                      onClick={() => saveTechnic(index)}
                      disabled={mutating}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      {mutating ? 'Збереження...' : 'Зберегти'}
                    </button>
                  )}
                </div>
              </div>

              {localTechnics.length > 1 && (
                <button
                  onClick={() => confirmDelete(index)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  disabled={mutating}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {technic.expanded && (
              <div className="p-6 space-y-6">
                {/* Вибір типу техніки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип техніки *
                  </label>
                  <Select
                    value={technic.type}
                    onChange={(value) => updateLocalTechnic(index, 'type', value)}
                    placeholder="Виберіть тип техніки"
                    className="w-full"
                    allowClear
                  >
                    {technicTypes.map(type => (
                      <Option key={type.id} value={type.id}>
                        {type.name}
                      </Option>
                    ))}
                    <Option value="custom">Інший (вказати вручну)</Option>
                  </Select>

                  {technic.type && technic.type !== 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Державний реєстраційний номер
                        {technic.type !== 'tower_crane' && <span className="text-red-500"> *</span>}
                      </label>
                      <Input
                        value={technic.registrationNumber || ''}
                        onChange={(e) => updateLocalTechnic(index, 'registrationNumber', e.target.value)}
                        placeholder="AA1234BB"
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* Поле для власного типу */}
                {technic.type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Назва техніки *
                    </label>
                    <Input
                      value={technic.customType}
                      onChange={(e) => updateLocalTechnic(index, 'customType', e.target.value)}
                      placeholder="Введіть назву техніки"
                    />
                  </div>
                )}

                {/* Документи */}
                {requiredDocuments.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">Необхідні документи:</h4>

                    {requiredDocuments.map((doc, docIndex) => (
                      <div key={docIndex} className="border border-gray-200 rounded-md p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {doc.name}
                        </label>

                        {/* Список завантажених файлів */}
                        {technic.documents[doc.name]?.map((docItem, fileIndex) => (
                          <div key={fileIndex} className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-md mb-2">
                            <DocumentIcon className="w-4 h-4 text-blue-500" />
                            <div className="flex-1">
                              <div className="text-sm text-gray-700">{docItem.file.name}</div>
                              {docItem.expiryDate && (
                                <div className="text-xs text-gray-500">Термін дії: {docItem.expiryDate}</div>
                              )}
                            </div>
                            {(docItem.file as any).url && (
                              <a
                                href={(docItem.file as any).url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Переглянути
                              </a>
                            )}
                            <button onClick={() => removeDocument(index, doc.name, fileIndex)}>
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        {/* Форма завантаження */}
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <Input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setTempFile({ techIndex: index, docType: doc.name, file });
                              }
                            }}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />
                          <DatePicker
                            placeholder="Термін дії"
                            format="DD.MM.YYYY"
                            onChange={(date, dateString) => {
                              if (tempFile && tempFile.techIndex === index && tempFile.docType === doc.name) {
                                handleFileUpload(index, doc.name, tempFile.file, dateString as string);
                                setTempFile(null);
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Якщо це власний тип або немає вибраного типу */}
                {(technic.type === 'custom' || !technic.type) && (
                  <div className="border border-gray-200 rounded-md p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Документи техніки
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      Додайте необхідні документи для цієї техніки
                    </p>

                    <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                      <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-600">Додати файл</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(index, 'general', file);
                          }
                        }}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Кнопка додавання нової техніки */}
      <div className="text-center">
        <button
          onClick={addTechnic}
          disabled={mutating}
          className="inline-flex items-center px-4 py-2 border-2 border-dashed border-green-500 text-green-600 rounded-md hover:border-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Додати техніку
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* Кнопка збереження всіх даних */}
      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={submitting || mutating || localTechnics.length === 0}
          className={`px-8 py-3 rounded-md transition-colors font-medium inline-flex items-center gap-2 ${!submitting && !mutating && localTechnics.length > 0
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
        >
          {(submitting || mutating) && <Spin size="small" />}
          {submitting || mutating ? 'Збереження...' : `Зберегти всю техніку (${localTechnics.length})`}
        </button>
      </div>
    </div>
  );
}