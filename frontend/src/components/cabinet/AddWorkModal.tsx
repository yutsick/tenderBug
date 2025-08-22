import { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWorkTypes, useWorkSubTypes } from '@/hooks/useWorks';
import Select from 'react-select';

interface WorkType {
    id: string;
    name: string;
}

interface WorkSubType {
    id: string;
    name: string;
    work_type: string;
    work_type_name: string;
    has_equipment: boolean;
}

interface Work {
    workTypeId: string;
    workTypeName: string;
    permitId: string;
    permitName: string;
    expiryDate: string;
    permitFile?: File;
}

interface AddWorkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (work: Work) => void;
}

export default function AddWorkModal({ isOpen, onClose, onAdd }: AddWorkModalProps) {
    const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<string>('');
    const [selectedPermitId, setSelectedPermitId] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Використовуємо кастомні хуки для API
    const { workTypes, loading: workTypesLoading, error: workTypesError } = useWorkTypes();
    const { workSubTypes, loading: subTypesLoading, error: subTypesError } = useWorkSubTypes();

    // Фільтруємо дозволи залежно від обраного типу роботи
    const availablePermits = selectedWorkTypeId
        ? workSubTypes.filter(subType => subType.work_type === selectedWorkTypeId)
        : [];

    const [permitFile, setPermitFile] = useState<File | null>(null);
    // Скидаємо форму при відкритті модалки
    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen]);

    // Скидаємо вибраний дозвіл при зміні типу роботи
    useEffect(() => {
        setSelectedPermitId('');
    }, [selectedWorkTypeId]);

    const resetForm = () => {
        setSelectedWorkTypeId('');
        setSelectedPermitId('');
        setExpiryDate('');
        setPermitFile(null);
        setError('');
    };

    const loading = workTypesLoading || subTypesLoading;
    const apiError = workTypesError || subTypesError;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedWorkTypeId || !selectedPermitId || !expiryDate) {
            setError('Заповніть всі поля');
            return;
        }

        const selectedWorkType = workTypes.find(wt => wt.id === selectedWorkTypeId);
        const selectedPermit = availablePermits.find(p => p.id === selectedPermitId);

        if (!selectedWorkType || !selectedPermit) {
            setError('Помилка вибору даних');
            return;
        }

        const work: Work = {
            workTypeId: selectedWorkTypeId,
            workTypeName: selectedWorkType.name,
            permitId: selectedPermitId,
            permitName: selectedPermit.name,
            expiryDate: expiryDate,
            permitFile: permitFile || undefined,
        };

        onAdd(work);
        onClose();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Додати роботу підвищеної небезпеки
                    </h3>
                    <button
                        onClick={handleClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {(error || apiError) && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700">{error || apiError}</p>
                        </div>
                    )}

                    {loading && (
                        <div className="text-center py-4">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                            <p className="text-sm text-gray-600 mt-2">Завантаження...</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Тип роботи *
                        </label>
                        <Select
                            value={workTypes.find(wt => wt.id === selectedWorkTypeId) ?
                                { value: selectedWorkTypeId, label: workTypes.find(wt => wt.id === selectedWorkTypeId)?.name } :
                                null
                            }
                            onChange={(option) => setSelectedWorkTypeId(option?.value || '')}
                            options={workTypes.map(wt => ({ value: wt.id, label: wt.name }))}
                            placeholder="Оберіть тип роботи..."
                            isSearchable
                            isDisabled={loading}
                            isClearable
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: '#d1d5db',
                                    '&:hover': {
                                        borderColor: '#10b981',
                                    },
                                    '&:focus-within': {
                                        borderColor: '#10b981',
                                        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                                    },
                                }),
                            }}
                        />
                    </div>

                     {/* Дозвіл */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Дозвіл *
                        </label>
                        <Select
                            value={availablePermits.find(p => p.id === selectedPermitId) ?
                                { value: selectedPermitId, label: availablePermits.find(p => p.id === selectedPermitId)?.name } :
                                null
                            }
                            onChange={(option) => setSelectedPermitId(option?.value || '')}
                            options={availablePermits.map(p => ({ value: p.id, label: p.name }))}
                            placeholder={selectedWorkTypeId ? 'Оберіть дозвіл...' : 'Спочатку оберіть тип роботи'}
                            isSearchable
                            isDisabled={!selectedWorkTypeId || loading}
                            isClearable
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: '#d1d5db',
                                    '&:hover': {
                                        borderColor: '#10b981',
                                    },
                                    '&:focus-within': {
                                        borderColor: '#10b981',
                                        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)',
                                    },
                                }),
                            }}
                        />
                        {selectedWorkTypeId && availablePermits.length === 0 && !loading && (
                            <p className="text-xs text-gray-500 mt-1">
                                Для цього типу роботи немає доступних дозволів
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Дата завершення дії дозволу *
                        </label>
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            required
                        />
                    </div>
<div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
        Файл дозволу (опціонально)
    </label>
    <input
        type="file"
        onChange={(e) => setPermitFile(e.target.files?.[0] || null)}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
    />
    {permitFile && (
        <p className="text-xs text-green-600 mt-1">
            Обрано: {permitFile.name}
        </p>
    )}
</div>
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Скасувати
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedWorkTypeId || !selectedPermitId || !expiryDate}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            Додати
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}