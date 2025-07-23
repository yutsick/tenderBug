import { useState } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface Technic {
  id: string;
  type: string;
  description: string;
  expanded: boolean;
  documents: {
    operationPermit: string;
    inspectionProtocol: string;
    supervisionLog: string;
    qualificationCertificate: string;
  };
}

interface TechnicsTabProps {
  onSubmit: () => void;
}

export default function TechnicsTab({ onSubmit }: TechnicsTabProps) {
  const [technics, setTechnics] = useState<Technic[]>([
    {
      id: '1',
      type: 'Ручний електроінструмент',
      description: '',
      expanded: false,
      documents: {
        operationPermit: '',
        inspectionProtocol: '',
        supervisionLog: '',
        qualificationCertificate: ''
      }
    },
    {
      id: '2',
      type: 'Компресори, пісокструйні агрегати',
      description: '',
      expanded: true,
      documents: {
        operationPermit: '',
        inspectionProtocol: '',
        supervisionLog: '',
        qualificationCertificate: ''
      }
    }
  ]);

  const addTechnic = () => {
    const newTechnic: Technic = {
      id: Date.now().toString(),
      type: '',
      description: '',
      expanded: true,
      documents: {
        operationPermit: '',
        inspectionProtocol: '',
        supervisionLog: '',
        qualificationCertificate: ''
      }
    };
    setTechnics([...technics, newTechnic]);
  };

  const removeTechnic = (id: string) => {
    setTechnics(technics.filter(tech => tech.id !== id));
  };

  const toggleTechnic = (id: string) => {
    setTechnics(technics.map(tech => 
      tech.id === id ? { ...tech, expanded: !tech.expanded } : tech
    ));
  };

  const updateTechnic = (id: string, field: keyof Technic, value: any) => {
    setTechnics(technics.map(tech => 
      tech.id === id ? { ...tech, [field]: value } : tech
    ));
  };

  const handleFileUpload = (techId: string, docType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Uploading file:', file.name, 'for technic:', techId, 'document:', docType);
      // Handle file upload logic here
    }
  };

  return (
    <div className="space-y-4">
      {technics.map((technic) => (
        <div key={technic.id} className="bg-white border border-gray-200 rounded-lg relative">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleTechnic(technic.id)}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                {technic.expanded ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </button>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Тип інструменту</h3>
                <p className="text-sm text-gray-600">{technic.type}</p>
              </div>
            </div>
            
            {technics.length > 1 && (
              <button
                onClick={() => removeTechnic(technic.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {technic.expanded && (
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип інструменту
                </label>
                <input
                  type="text"
                  value={technic.type}
                  onChange={(e) => updateTechnic(technic.id, 'type', e.target.value)}
                  placeholder="Введіть тип інструменту"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дозвіл на експлуатацію сосудин під тиском
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(technic.id, 'operationPermit', e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Протокол інспекції ізоляції ручного інструменту
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(technic.id, 'inspectionProtocol', e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Журнал нагляду посудини що працює під тиском
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(technic.id, 'supervisionLog', e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кваліфікаційне посвідчення машиніста компресора
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(technic.id, 'qualificationCertificate', e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="text-center">
        <button 
          onClick={addTechnic}
          className="inline-flex items-center px-4 py-2 border-2 border-dashed border-green-500 text-green-600 rounded-md hover:border-green-600 hover:bg-green-50 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Додати інструмент
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