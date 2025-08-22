// src/components/cabinet/InstrumentsTab.tsx - З ПОВНОЮ API ІНТЕГРАЦІЄЮ
import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, DocumentArrowUpIcon, CheckCircleIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { Alert, Spin, message, Modal, Select, Input } from 'antd';
import { useUserInstruments, useInstrumentTypes } from '@/hooks/useUserData';
import { apiClient } from '@/lib/api';
import type { InstrumentFormData, DocumentsCollection, RequiredDocument } from '@/types/userdata';

const { Option } = Select;

interface InstrumentsTabProps {
  onSubmit: () => void;
}

export default function InstrumentsTab({ onSubmit }: InstrumentsTabProps) {
  // Хуки для роботи з API
  const { 
    instruments, 
    loading: instrumentsLoading, 
    mutating, 
    createInstrument, 
    updateInstrument, 
    deleteInstrument 
  } = useUserInstruments();
  
  const { instrumentTypes, loading: typesLoading } = useInstrumentTypes();

  // Локальний стейт
  const [localInstruments, setLocalInstruments] = useState<InstrumentFormData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Синхронізація з API даними
  useEffect(() => {
    if (instruments.length > 0) {
      const converted = instruments.map(inst => ({
        id: inst.id,
        type: inst.instrument_type || 'custom',
        customType: inst.custom_type || '',
        documents: convertDocumentsToFormData(inst.documents),
        expanded: false
      }));
      setLocalInstruments(converted);
    } else {
      // Якщо немає збережених, додаємо один порожній
      setLocalInstruments([{
        id: undefined,
        type: '',
        customType: '',
        documents: {},
        expanded: true
      }]);
    }
  }, [instruments]);

  // Конвертуємо документи з API формату в форм дату
  const convertDocumentsToFormData = (docs: DocumentsCollection): { [key: string]: File[] } => {
    const result: { [key: string]: File[] } = {};
    Object.entries(docs).forEach(([docType, files]) => {
      result[docType] = files.map(file => {
        const mockFile = new File([''], file.name, { type: 'application/octet-stream' });
        (mockFile as any).url = file.url || file.path;
        return mockFile;
      });
    });
    return result;
  };

  // Конвертуємо форм дату в API формат
  const convertFormDataToDocuments = (formDocs: { [key: string]: File[] }): DocumentsCollection => {
    const result: DocumentsCollection = {};
    Object.entries(formDocs).forEach(([docType, files]) => {
      result[docType] = files.map(file => ({
        name: file.name,
        path: (file as any).url || '',
        size: file.size
      }));
    });
    return result;
  };

  const addInstrument = () => {
    const newInstrument: InstrumentFormData = {
      id: undefined,
      type: '',
      customType: '',
      documents: {},
      expanded: true
    };
    setLocalInstruments([...localInstruments, newInstrument]);
  };

  const removeInstrument = async (index: number) => {
    const instrument = localInstruments[index];
    
    if (instrument.id) {
      try {
        await deleteInstrument(instrument.id);
        message.success('Інструмент видалено');
      } catch (error) {
        console.error('Помилка видалення інструменту:', error);
        message.error('Не вдалося видалити інструмент');
        return;
      }
    }
    
    setLocalInstruments(localInstruments.filter((_, i) => i !== index));
  };

  const toggleInstrument = (index: number) => {
    setLocalInstruments(localInstruments.map((inst, i) => 
      i === index ? { ...inst, expanded: !inst.expanded } : inst
    ));
  };

  const updateLocalInstrument = (index: number, field: keyof InstrumentFormData, value: any) => {
    setLocalInstruments(localInstruments.map((inst, i) => 
      i === index ? { ...inst, [field]: value } : inst
    ));
  };

  const handleFileUpload = async (instIndex: number, docType: string, file: File) => {
    try {
      const uploadResponse = await apiClient.uploadDocument(file, `instrument_${docType}`);
      
      if (uploadResponse.success && uploadResponse.file_info) {
        const fileWithUrl = new File([file], file.name, { type: file.type });
        (fileWithUrl as any).url = uploadResponse.file_info.path;
        
        setLocalInstruments(prev => prev.map((inst, i) => {
          if (i === instIndex) {
            const updatedDocs = { ...inst.documents };
            if (!updatedDocs[docType]) {
              updatedDocs[docType] = [];
            }
            updatedDocs[docType] = [...updatedDocs[docType], fileWithUrl];
            return { ...inst, documents: updatedDocs };
          }
          return inst;
        }));
        
        message.success('Файл успішно завантажено');
      }
    } catch (error) {
      console.error('Помилка завантаження файлу:', error);
      message.error('Не вдалося завантажити файл');
    }
  };

  const removeDocument = (instIndex: number, docType: string, fileIndex: number) => {
    setLocalInstruments(prev => prev.map((inst, i) => {
      if (i === instIndex) {
        const updatedDocs = { ...inst.documents };
        if (updatedDocs[docType]) {
          updatedDocs[docType] = updatedDocs[docType].filter((_, idx) => idx !== fileIndex);
          if (updatedDocs[docType].length === 0) {
            delete updatedDocs[docType];
          }
        }
        return { ...inst, documents: updatedDocs };
      }
      return inst;
    }));
  };

  const saveInstrument = async (index: number) => {
    const instrument = localInstruments[index];
    
    if (!instrument.type && !instrument.customType) {
      message.warning('Виберіть або введіть тип інструменту');
      return;
    }

    try {
      const instrumentData = {
        instrument_type: instrument.type === 'custom' ? undefined : instrument.type,
        custom_type: instrument.type === 'custom' ? instrument.customType : undefined,
        documents: convertFormDataToDocuments(instrument.documents)
      };
      
      if (instrument.id) {
        await updateInstrument(instrument.id, instrumentData);
        message.success('Дані інструменту оновлено');
      } else {
        const newInst = await createInstrument(instrumentData);
        setLocalInstruments(prev => prev.map((inst, i) => 
          i === index ? { ...inst, id: newInst.id } : inst
        ));
        message.success('Інструмент додано');
      }
    } catch (error) {
      console.error('Помилка збереження інструменту:', error);
      message.error('Не вдалося зберегти дані інструменту');
    }
  };

  const handleSubmit = async () => {
  
    if (localInstruments.length === 0) {
      message.warning('Додайте хоча б один інструмент');
      return;
    }

    const invalidInstruments = localInstruments.filter(inst => !inst.type && !inst.customType);
    if (invalidInstruments.length > 0) {
      message.warning('Заповніть типи всіх інструментів');
      return;
    }

    setSubmitting(true);
    try {
      const unsavedInstruments = localInstruments.filter(inst => !inst.id);
      
      for (const instrument of unsavedInstruments) {
        const instrumentData = {
          instrument_type: instrument.type === 'custom' ? undefined : instrument.type,
          custom_type: instrument.type === 'custom' ? instrument.customType : undefined,
          documents: convertFormDataToDocuments(instrument.documents)
        };
        await createInstrument(instrumentData);
      }

          const existingInstruments = localInstruments.filter(inst => inst.id);
    for (const instrument of existingInstruments) {
      const instrumentData = {
        instrument_type: instrument.type === 'custom' ? undefined : instrument.type,
        custom_type: instrument.type === 'custom' ? instrument.customType : undefined,
        documents: convertFormDataToDocuments(instrument.documents)
      };
      await updateInstrument(instrument.id!, instrumentData);
    }

      message.success('Всі дані інструментів збережено!');
      onSubmit();
    } catch (error) {
      console.error('Помилка збереження:', error);
      message.error('Не вдалося зберегти дані');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (index: number) => {
    Modal.confirm({
      title: 'Видалення інструменту',
      content: 'Ви впевнені, що хочете видалити цей інструмент?',
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: () => removeInstrument(index)
    });
  };

  const getRequiredDocuments = (instrumentType: string): RequiredDocument[] => {
    if (instrumentType === 'custom' || !instrumentType) return [];
    const type = instrumentTypes.find(t => t.id === instrumentType);
    return type?.required_documents || [];
  };

  if (instrumentsLoading || typesLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {instruments.length > 0 && (
        <Alert
          message={`Збережено ${instruments.length} видів інструментів`}
          description="Дані синхронізовані з сервером"
          type="success"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          showIcon
          className="mb-4"
        />
      )}

      {localInstruments.map((instrument, index) => {
        const requiredDocuments = getRequiredDocuments(instrument.type);
        
        return (
          <div key={index} className="bg-white border border-gray-200 rounded-lg relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleInstrument(index)}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                  {instrument.expanded ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </button>
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      Інструмент #{index + 1}
                      {instrument.id && (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" title="Збережено" />
                      )}
                    </h3>
                    {instrument.type && (
                      <p className="text-sm text-gray-600">
                        {instrument.type === 'custom' ? instrument.customType : 
                         instrumentTypes.find(t => t.id === instrument.type)?.name || instrument.type}
                      </p>
                    )}
                  </div>
                  
                  {!instrument.id && (instrument.type || instrument.customType) && (
                    <button
                      onClick={() => saveInstrument(index)}
                      disabled={mutating}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      {mutating ? 'Збереження...' : 'Зберегти'}
                    </button>
                  )}
                </div>
              </div>
              
              {localInstruments.length > 1 && (
                <button
                  onClick={() => confirmDelete(index)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  disabled={mutating}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {instrument.expanded && (
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип інструменту *
                  </label>
                  <Select
                    value={instrument.type}
                    onChange={(value) => updateLocalInstrument(index, 'type', value)}
                    placeholder="Виберіть тип інструменту"
                    className="w-full"
                    allowClear
                  >
                    {instrumentTypes.map(type => (
                      <Option key={type.id} value={type.id}>
                        {type.name}
                      </Option>
                    ))}
                    <Option value="custom">Інший (вказати вручну)</Option>
                  </Select>
                </div>

                {instrument.type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Назва інструменту *
                    </label>
                    <Input
                      value={instrument.customType}
                      onChange={(e) => updateLocalInstrument(index, 'customType', e.target.value)}
                      placeholder="Введіть назву інструменту"
                    />
                  </div>
                )}

                {requiredDocuments.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800">Необхідні документи:</h4>
                    
                    {requiredDocuments.map((doc, docIndex) => (
                      <div key={docIndex} className="border border-gray-200 rounded-md p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {doc.name} {doc.is_multiple && "(можна додати кілька файлів)"}
                        </label>
                        
                        {instrument.documents[doc.name] && instrument.documents[doc.name].length > 0 && (
                          <div className="space-y-2 mb-3">
                            {instrument.documents[doc.name].map((file, fileIndex) => (
                              <div key={fileIndex} className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
                                <DocumentIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>
                                {(file as any).url && (
                                  <a 
                                    href={(file as any).url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Переглянути
                                  </a>
                                )}
                                <button
                                  onClick={() => removeDocument(index, doc.name, fileIndex)}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                          <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                          <span className="text-sm text-gray-600">Додати файл</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(index, doc.name, file);
                              }
                            }}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {(instrument.type === 'custom' || !instrument.type) && (
                  <div className="border border-gray-200 rounded-md p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Документи інструменту
                    </label>
                    <p className="text-sm text-gray-500 mb-3">
                      Додайте необхідні документи для цього інструменту
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

      <div className="text-center">
        <button 
          onClick={addInstrument}
          disabled={mutating}
          className="inline-flex items-center px-4 py-2 border-2 border-dashed border-green-500 text-green-600 rounded-md hover:border-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Додати інструмент
        </button>
      </div>

      <hr className="border-gray-200" />

      <div className="text-center">
        <button 
          onClick={handleSubmit}
          disabled={submitting || mutating || localInstruments.length === 0}
          className={`px-8 py-3 rounded-md transition-colors font-medium inline-flex items-center gap-2 ${
            !submitting && !mutating && localInstruments.length > 0
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
        >
          {(submitting || mutating) && <Spin size="small" />}
          {submitting || mutating ? 'Збереження...' : `Зберегти всі інструменти (${localInstruments.length})`}
        </button>
      </div>
    </div>
  );
}