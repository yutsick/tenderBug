// frontend/src/types/works.ts

export interface WorkType {
  id: string;
  name: string;
}

export interface WorkSubType {
  id: string;
  name: string;
  work_type: string;  // ID типу роботи
  work_type_name: string;
  has_equipment: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  subtype: string;  // ID підтипу
  subtype_name: string;
}

export interface UserWork {
  id?: string;
  work_type: string;
  work_type_name: string;
  work_sub_type: string;
  work_sub_type_name: string;
  expiry_date: string;
  permit_file?: string;
  is_expired: boolean;
  created_at?: string;
}

export interface CreateUserWork {
  work_type: string;
  work_sub_type: string;
  expiry_date: string;
  permit_file?: File;
}

export interface WorkFormData {
  workTypeId: string;
  workTypeName: string;
  permitId: string;
  permitName: string;
  expiryDate: string;
  hasEquipment?: boolean;
}