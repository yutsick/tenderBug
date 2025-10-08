// frontend/src/types/userdata.ts - Нові типи для даних користувача

// ===================================================================
// Базові типи для довідників

export interface TechnicType {
  id: string;
  name: string;
  required_documents: RequiredDocument[];
}

export interface InstrumentType {
  id: string;
  name: string;
  required_documents: RequiredDocument[];
}

export interface RequiredDocument {
  name: string;
  is_multiple: boolean;
}

export interface OrderType {
  value: string;
  label: string;
}

// ===================================================================
// Файлова система

export interface FileInfo {
  name: string;
  original_name?: string;
  path: string;
  url?: string;
  size?: number;
  document_type?: string;
  expiry_date?: string;
}

export interface DocumentsCollection {
  [documentType: string]: FileInfo[];
}

// ===================================================================
// Специфікація робіт (таб Роботи)

export interface UserSpecification {
  id?: string;
  specification_type: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserSpecification {
  specification_type: string;
}

// ===================================================================
// Співробітники (таб Співробітники)

export interface UserEmployee {
  id?: string;
  name: string;
  photo?: File | string;
  photo_url?: string;
  medical_exam_date: string;
  organization_name: string;
  position: string;
  qualification_certificate?: File | string;
  qualification_certificate_url?: string;
  qualification_expiry_date: string;
  safety_training_certificate?: File | string;
  safety_training_certificate_url?: string;
  safety_training_date: string;
  special_training_certificate?: File | string;
  special_training_certificate_url?: string;
  special_training_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserEmployee {
  name: string;
  photo?: File;
  medical_exam_date: string;
  organization_name: string;
  position: string;
  qualification_certificate?: File;
  qualification_issue_date: string;
  safety_training_certificate?: File;
  safety_training_date?: string;
  special_training_certificate?: File;
  special_training_date?: string;
}

// ===================================================================
// Накази (таб Накази)

export interface UserOrder {
  custom_title: string;
  id?: string;
  order_type: string;
  order_type_display: string;
  documents: FileInfo[];
  documents_info: FileInfo[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserOrder {
  order_type: string;
  documents: FileInfo[];
  custom_title?: string;
}

// ===================================================================
// Техніка (таб Техніка)

export interface UserTechnic {
  registration_number: string;
  id?: string;
  technic_type?: string;
  technic_type_name?: string;
  custom_type: string;
  display_name: string;
  documents: DocumentsCollection;
  documents_info: DocumentsCollection;
  required_documents: RequiredDocument[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserTechnic {
  technic_type?: string;
  custom_type?: string;
  documents: DocumentsCollection;
  registration_number?: string;
}

// ===================================================================
// Інструменти (таб Інструменти)

export interface UserInstrument {
  id?: string;
  instrument_type?: string;
  instrument_type_name?: string;
  custom_type: string;
  display_name: string;
  documents: DocumentsCollection;
  documents_info: DocumentsCollection;
  required_documents: RequiredDocument[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserInstrument {
  instrument_type?: string;
  custom_type?: string;
  documents: DocumentsCollection;
}

// ===================================================================
// ЗІЗ (таб ЗІЗ)

export interface UserPPE {
  id?: string;
  documents: FileInfo[];
  documents_info: FileInfo[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserPPE {
  documents: FileInfo[];
}

// ===================================================================
// Форми для UI компонентів

export interface EmployeeFormData {
  id?: string;
  name: string;
  photo?: File | string;                           // ✅ File або URL
  medicalExamDate: string;
  organizationName: string;
  position: string;
  qualificationCertificate?: File | string;       // ✅ File або URL
  qualificationExpiryDate: string;
  safetyTrainingCertificate?: File | string;      // ✅ File або URL
  safetyTrainingDate: string;
  specialTrainingCertificate?: File | string;     // ✅ File або URL
  specialTrainingDate?: string;
  expanded?: boolean;
}

export interface TechnicDocument {
  file: File;
  expiryDate?: string;
  name?: string;

}

export interface TechnicFormData {
  id?: string;
  type: string;
  customType?: string;
  registrationNumber?: string; 
  description?: string;
   documents: { [key: string]: TechnicDocument[] };
  expanded?: boolean;
}

export interface InstrumentFormData {
  id?: string;
  type: string;
  customType?: string;
  documents: { [key: string]: File[] };
  expanded?: boolean;
}

// ===================================================================
// API Response типи

export interface UserDataResponse<T> {
  data: T;
}

export interface UserDataListResponse<T> {
  data: T[] | {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
  };
}

export interface UploadResponse {
  success: boolean;
  file_info?: FileInfo;
  error?: string;
}

// ===================================================================
// Error типи

export interface UserDataError {
  message: string;
  field?: string;
  code?: string;
}

// ===================================================================
// Loading states

export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface MutationState extends LoadingState {
  success: boolean;
}

// ===================================================================
// Utility types

export type TabType = 'works' | 'employees' | 'orders' | 'technics' | 'instruments' | 'ppe';

export interface TabStatus {
  hasData: boolean;
  isValid: boolean;
  lastUpdated?: string;
}

export interface UserDataSummary {
  specification: TabStatus;
  employees: TabStatus;
  orders: TabStatus;
  technics: TabStatus;
  instruments: TabStatus;
  ppe: TabStatus;
}

// ===================================================================
// Конвертери між форматами

export const convertEmployeeToFormData = (employee: UserEmployee): EmployeeFormData => ({
  id: employee.id,
  name: employee.name || '',
  photo: employee.photo || undefined,                           // ✅ файл
  medicalExamDate: employee.medical_exam_date || '',
  organizationName: employee.organization_name || '',
  position: employee.position || '',
  qualificationCertificate: employee.qualification_certificate || undefined,  // ✅ файл
  qualificationExpiryDate: employee.qualification_expiry_date || '',
  safetyTrainingCertificate: employee.safety_training_certificate || undefined,  // ✅ файл
  safetyTrainingDate: employee.safety_training_date || '',
  specialTrainingCertificate: employee.special_training_certificate || undefined,  // ✅ файл
  specialTrainingDate: employee.special_training_date || '',
  expanded: false
});

export const convertFormDataToEmployee = (formData: EmployeeFormData): CreateUserEmployee => {
  const data: any = {
    name: formData.name,
    organization_name: formData.organizationName,
    position: formData.position,
  };

  // Додаємо файли ТІЛЬКИ якщо вони є File об'єкти (не URL строки)
  if (formData.photo instanceof File) {
    data.photo = formData.photo;
  }
  if (formData.qualificationCertificate instanceof File) {
    data.qualification_certificate = formData.qualificationCertificate;
  }
  if (formData.safetyTrainingCertificate instanceof File) {
    data.safety_training_certificate = formData.safetyTrainingCertificate;
  }
  if (formData.specialTrainingCertificate instanceof File) {
    data.special_training_certificate = formData.specialTrainingCertificate;
  }

  // Функція для перевірки валідності дати
  const isValidDate = (date: any) => date && date !== '' && date !== 'undefined' && date !== undefined;

  // Додаємо дати тільки якщо вони валідні
  if (isValidDate(formData.medicalExamDate)) {
    data.medical_exam_date = formData.medicalExamDate;
  }
  if (isValidDate(formData.qualificationExpiryDate)) {
    data.qualification_expiry_date = formData.qualificationExpiryDate;
  }
  if (isValidDate(formData.safetyTrainingDate)) {
    data.safety_training_date = formData.safetyTrainingDate;
  }
  if (isValidDate(formData.specialTrainingDate)) {
    data.special_training_date = formData.specialTrainingDate;
  }
  
  console.log('🔍 ConvertFormData input:', formData);  // DEBUG
  console.log('🔍 ConvertFormData output:', data);     // DEBUG
  
  return data;
};