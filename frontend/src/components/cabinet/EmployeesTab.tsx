// src/components/cabinet/EmployeesTab.tsx - З ПОВНОЮ API ІНТЕГРАЦІЄЮ (контекст AntD App.useApp)
import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, DocumentArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { App, Alert, Spin } from 'antd';
import { useUserEmployees } from '@/hooks/useUserData';
import { convertEmployeeToFormData, convertFormDataToEmployee } from '@/types/userdata';
import type { EmployeeFormData } from '@/types/userdata';

interface EmployeesTabProps {
  onSubmit: () => void;
}

export default function EmployeesTab({ onSubmit }: EmployeesTabProps) {
  // АнтД контекстні API (повідомлення/модалки — без статичних викликів)
  const { message: apiMessage, modal } = App.useApp();

  // Хук для роботи з API
  const { 
    employees, 
    loading, 
    mutating, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee 
  } = useUserEmployees();

  // Локальний стейт
  const [localEmployees, setLocalEmployees] = useState<EmployeeFormData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Синхронізація з API даними
  useEffect(() => {
    if (employees.length > 0) {
      const converted = employees.map(emp => ({
        ...convertEmployeeToFormData(emp),
        expanded: false
      }));
      setLocalEmployees(converted);
    } else {
      // Якщо немає збережених співробітників, додаємо один порожній
      setLocalEmployees([{
        id: undefined,
        name: '',
        medicalExamDate: '',
        organizationName: '',
        position: '',
        qualificationIssueDate: '',
        safetyTrainingDate: '',
        specialTrainingDate: '',
        expanded: true
      }]);
    }
  }, [employees]);

  const addEmployee = () => {
    const newEmployee: EmployeeFormData = {
      id: undefined,
      name: '',
      medicalExamDate: '',
      organizationName: '',
      position: '',
      qualificationIssueDate: '',
      safetyTrainingDate: '',
      specialTrainingDate: '',
      expanded: true
    };
    setLocalEmployees(prev => [...prev, newEmployee]);
  };

  const removeEmployee = async (index: number) => {
    const employee = localEmployees[index];
    
    if (employee.id) {
      // Якщо співробітник збережений в API, видаляємо з сервера
      try {
        await deleteEmployee(employee.id);
        apiMessage.success('Співробітника видалено');
      } catch (error) {
        console.error('Помилка видалення співробітника:', error);
        apiMessage.error('Не вдалося видалити співробітника');
        return;
      }
    }
    
    // Видаляємо з локального стейту
    setLocalEmployees(prev => prev.filter((_, i) => i !== index));
  };

  const toggleEmployee = (index: number) => {
    setLocalEmployees(prev =>
      prev.map((emp, i) => i === index ? { ...emp, expanded: !emp.expanded } : emp)
    );
  };

  const updateLocalEmployee = (index: number, field: keyof EmployeeFormData, value: any) => {
    setLocalEmployees(prev =>
      prev.map((emp, i) => i === index ? { ...emp, [field]: value } : emp)
    );
  };

  const handleFileUpload = (empIndex: number, field: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateLocalEmployee(empIndex, field as keyof EmployeeFormData, file);
    }
  };

  const saveEmployee = async (index: number) => {
    const employee = localEmployees[index];

    // Валідація
    if (!employee.name.trim()) {
      apiMessage.warning('Введіть ім\'я співробітника');
      return;
    }

    try {
      const employeeData = convertFormDataToEmployee(employee);
      if (employee.id) {
        // Оновлення існуючого
        await updateEmployee(employee.id, employeeData);
        apiMessage.success('Дані співробітника оновлено');
      } else {
        // Створення нового
        const newEmp = await createEmployee(employeeData);
        // Оновлюємо локальний стейт з ID з сервера
        setLocalEmployees(prev => prev.map((emp, i) => 
          i === index ? { ...emp, id: newEmp.id } : emp
        ));
        apiMessage.success('Співробітника додано');
      }
    } catch (error) {
      console.error('Помилка збереження співробітника:', error);
      apiMessage.error('Не вдалося зберегти дані співробітника');
    }
  };

  const handleSubmit = async () => {
    if (localEmployees.length === 0) {
      apiMessage.warning('Додайте хоча б одного співробітника');
      return;
    }

    const invalidEmployees = localEmployees.filter(emp => !emp.name.trim());
    if (invalidEmployees.length > 0) {
      apiMessage.warning('Заповніть імена всіх співробітників');
      return;
    }

    setSubmitting(true);
    try {
      // ✅ СТВОРЮЄМО нових співробітників
      const unsavedEmployees = localEmployees.filter(emp => !emp.id);
      for (const employee of unsavedEmployees) {
        const employeeData = convertFormDataToEmployee(employee);
        await createEmployee(employeeData);
      }

      // ✅ ОНОВЛЮЄМО існуючих співробітників
      const existingEmployees = localEmployees.filter(emp => emp.id);
      for (const employee of existingEmployees) {
        const employeeData = convertFormDataToEmployee(employee);
        await updateEmployee(employee.id!, employeeData);
      }

      apiMessage.success('Всі дані співробітників збережено!');
      onSubmit();
    } catch (error) {
      console.error('Помилка збереження:', error);
      apiMessage.error('Не вдалося зберегти дані');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (index: number) => {
    const employee = localEmployees[index];
    modal.confirm({
      title: 'Видалення співробітника',
      content: `Ви впевнені, що хочете видалити ${employee.name || 'цього співробітника'}?`,
      okText: 'Видалити',
      okType: 'danger',
      cancelText: 'Скасувати',
      onOk: () => removeEmployee(index),
    });
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
    <div className="space-y-4">
      {/* Показуємо статус збереження */}
      {employees.length > 0 && (
        <Alert
          message={`Збережено ${employees.length} співробітників`}
          description="Дані синхронізовані з сервером"
          type="success"
          icon={<CheckCircleIcon className="w-4 h-4" />}
          showIcon
          className="mb-4"
        />
      )}

      {localEmployees.map((employee, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg relative">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleEmployee(index)}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                {employee.expanded ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </button>
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    Співробітник #{index + 1}
                    {employee.id && (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" title="Збережено" />
                    )}
                  </h3>
                  {employee.name && (
                    <p className="text-sm text-gray-600">{employee.name}</p>
                  )}
                </div>
                
                {/* Кнопка швидкого збереження */}
                {!employee.id && employee.name.trim() && (
                  <button
                    onClick={() => saveEmployee(index)}
                    disabled={mutating}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  >
                    {mutating ? 'Збереження...' : 'Зберегти'}
                  </button>
                )}
              </div>
            </div>
            
            {localEmployees.length > 1 && (
              <button
                onClick={() => confirmDelete(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                disabled={mutating}
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
                    П.І.Б. *
                  </label>
                  <input
                    type="text"
                    value={employee.name}
                    onChange={(e) => updateLocalEmployee(index, 'name', e.target.value)}
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
                    <span className="text-sm text-gray-600">
                      {employee.photo ? (employee.photo as File).name || 'Файл завантажено' : 'Додати файл'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(index, 'photo', e)}
                      accept="image/*"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата закінчення дії періодичного медичного огляду *
                </label>
                <input
                  type="date"
                  value={employee.medicalExamDate || ''}
                  onChange={(e) => updateLocalEmployee(index, 'medicalExamDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Назва підрядної/субпідрядної організації *
                  </label>
                  <input
                    type="text"
                    value={employee.organizationName}
                    onChange={(e) => updateLocalEmployee(index, 'organizationName', e.target.value)}
                    placeholder="Введіть назву організації"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Посада/професія *
                  </label>
                  <input
                    type="text"
                    value={employee.position}
                    onChange={(e) => updateLocalEmployee(index, 'position', e.target.value)}
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
                    <span className="text-sm text-gray-600">
                      {employee.qualificationCertificate ? (employee.qualificationCertificate as File).name || 'Файл завантажено' : 'Додати файл'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(index, 'qualificationCertificate', e)}
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
                    value={employee.qualificationIssueDate || ''}
                    onChange={(e) => updateLocalEmployee(index, 'qualificationIssueDate', e.target.value)}
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
                    <span className="text-sm text-gray-600">
                      {employee.safetyTrainingCertificate ? (employee.safetyTrainingCertificate as File).name || 'Файл завантажено' : 'Додати файл'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(index, 'safetyTrainingCertificate', e)}
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
                    value={employee.safetyTrainingDate || ''}
                    onChange={(e) => updateLocalEmployee(index, 'safetyTrainingDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Посвідчення про проходження спеціального навчання
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <DocumentArrowUpIcon className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {employee.specialTrainingCertificate ? (employee.specialTrainingCertificate as File).name || 'Файл завантажено' : 'Додати файл'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(index, 'specialTrainingCertificate', e)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата закінчення дії
                  </label>
                  <input
                    type="date"
                    value={employee.specialTrainingDate || ''}
                    onChange={(e) => updateLocalEmployee(index, 'specialTrainingDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Кнопка додавання нового співробітника */}
      <div className="text-center">
        <button 
          onClick={addEmployee}
          disabled={mutating}
          className="inline-flex items-center px-4 py-2 border-2 border-dashed border-green-500 text-green-600 rounded-md hover:border-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Додати співробітника
        </button>
      </div>

      <hr className="border-gray-200" />

      {/* Кнопка збереження всіх даних */}
      <div className="text-center">
        <button 
          onClick={handleSubmit}
          disabled={submitting || mutating || localEmployees.length === 0}
          className={`px-8 py-3 rounded-md transition-colors font-medium inline-flex items-center gap-2 ${
            !submitting && !mutating && localEmployees.length > 0
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
        >
          {(submitting || mutating) && <Spin size="small" />}
          {submitting || mutating ? 'Збереження...' : `Зберегти всіх співробітників (${localEmployees.length})`}
        </button>
      </div>
    </div>
  );
}
