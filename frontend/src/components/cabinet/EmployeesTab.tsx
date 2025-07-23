import { useState } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface Employee {
  id: string;
  name: string;
  photo: string;
  medicalExamDate: string;
  organizationName: string;
  position: string;
  qualificationCertificate: string;
  qualificationIssueDate: string;
  safetyTrainingCertificate: string;
  safetyTrainingDate: string;
  expanded: boolean;
}

interface EmployeesTabProps {
  onSubmit: () => void;
}

export default function EmployeesTab({ onSubmit }: EmployeesTabProps) {
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: '1',
      name: 'Давиденко Олексій Давидович',
      photo: '',
      medicalExamDate: '2026-09-25',
      organizationName: '',
      position: '',
      qualificationCertificate: '',
      qualificationIssueDate: '2026-09-25',
      safetyTrainingCertificate: '',
      safetyTrainingDate: '2026-09-25',
      expanded: false
    },
    {
      id: '2',
      name: '',
      photo: '',
      medicalExamDate: '',
      organizationName: '',
      position: '',
      qualificationCertificate: '',
      qualificationIssueDate: '',
      safetyTrainingCertificate: '',
      safetyTrainingDate: '',
      expanded: true
    }
  ]);

  const addEmployee = () => {
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name: '',
      photo: '',
      medicalExamDate: '',
      organizationName: '',
      position: '',
      qualificationCertificate: '',
      qualificationIssueDate: '',
      safetyTrainingCertificate: '',
      safetyTrainingDate: '',
      expanded: true
    };
    setEmployees([...employees, newEmployee]);
  };

  const removeEmployee = (id: string) => {
    setEmployees(employees.filter(emp => emp.id !== id));
  };

  const toggleEmployee = (id: string) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, expanded: !emp.expanded } : emp
    ));
  };

  const updateEmployee = (id: string, field: keyof Employee, value: any) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  };

  const handleFileUpload = (empId: string, field: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Uploading file:', file.name, 'for employee:', empId, 'field:', field);
      // Handle file upload logic here
    }
  };

  return (
    <div className="space-y-4">
      {employees.map((employee) => (
        <div key={employee.id} className="bg-white border border-gray-200 rounded-lg relative">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleEmployee(employee.id)}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                {employee.expanded ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </button>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Співробітник</h3>
                {employee.name && (
                  <p className="text-sm text-gray-600">{employee.name}</p>
                )}
              </div>
            </div>
            
            {employees.length > 1 && (
              <button
                onClick={() => removeEmployee(employee.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {employee.expanded && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    П.І.Б.
                  </label>
                  <input
                    type="text"
                    value={employee.name}
                    onChange={(e) => updateEmployee(employee.id, 'name', e.target.value)}
                    placeholder="Введіть повне ім'я"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фото
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(employee.id, 'photo', e)}
                      accept="image/*"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата закінчення дії періодичного медичного огляду
                  </label>
                  <input
                    type="date"
                    value={employee.medicalExamDate}
                    onChange={(e) => updateEmployee(employee.id, 'medicalExamDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Назва підрядної/субпідрядної організації
                  </label>
                  <input
                    type="text"
                    value={employee.organizationName}
                    onChange={(e) => updateEmployee(employee.id, 'organizationName', e.target.value)}
                    placeholder="Введіть назву організації"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Посада/професія
                  </label>
                  <input
                    type="text"
                    value={employee.position}
                    onChange={(e) => updateEmployee(employee.id, 'position', e.target.value)}
                    placeholder="Введіть посаду"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Кваліфікаційне посвідчення
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(employee.id, 'qualification', e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата видачі
                  </label>
                  <input
                    type="date"
                    value={employee.qualificationIssueDate}
                    onChange={(e) => updateEmployee(employee.id, 'qualificationIssueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Посвідчення про проходження навчання з питань ОП
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Додати файл</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(employee.id, 'safety', e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата закінчення дії посвідчення
                  </label>
                  <input
                    type="date"
                    value={employee.safetyTrainingDate}
                    onChange={(e) => updateEmployee(employee.id, 'safetyTrainingDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Посвідчення про проходження спеціального навчання безпечним методам виконання робіт підвищеної небезпеки
                </label>
                <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                  <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">Додати файл</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(employee.id, 'specialTraining', e)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="text-center">
        <button 
          onClick={addEmployee}
          className="inline-flex items-center px-4 py-2 border-2 border-dashed border-green-500 text-green-600 rounded-md hover:border-green-600 hover:bg-green-50 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Додати співробітника
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