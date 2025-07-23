import { useState } from 'react';
import { DocumentArrowUpIcon, DocumentIcon, TrashIcon } from '@heroicons/react/24/outline';

interface PPETabProps {
  onSubmit: () => void;
}

export default function PPETab({ onSubmit }: PPETabProps) {
  const [documents, setDocuments] = useState([
    { id: '1', name: 'Dozvil2026-05.doc', type: 'uploaded' },
    { id: '2', name: 'Dozvil_Electro2026-05.doc', type: 'uploaded' }
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File uploaded:', file.name);
      // Add new document to the list
      const newDoc = {
        id: Date.now().toString(),
        name: file.name,
        type: 'uploaded'
      };
      setDocuments([...documents, newDoc]);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4 leading-relaxed">
          Копії повірки (випробувань) засобів колективного та індивідуального захисту 
          (страхувальні засоби від падіння з висоти, електроізоляційні засоби, тощо)
        </h3>

        <div className="space-y-4">
          {documents.map((document) => (
            <div key={document.id} className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <DocumentIcon className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <span className="flex-1 font-medium text-gray-700">{document.name}</span>
              <button
                onClick={() => removeDocument(document.id)}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}

          <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors min-h-[48px]">
            <DocumentArrowUpIcon className="w-6 h-6 mr-3 text-gray-400" />
            <span className="text-gray-600 font-medium">Додати файл</span>
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </label>
        </div>
      </div>

      <hr className="border-gray-200" />

      <div className="text-center">
        <button 
          onClick={onSubmit}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
        >
          Надіслати дані
        </button>
      </div>
    </div>
  );
}