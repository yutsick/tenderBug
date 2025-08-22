import axios, { AxiosError } from 'axios';
import { 
  User, 
  RegistrationData, 
  LoginData, 
  ActivationData
} from '@/types/user';

import { Department } from '@/types/department';

import { 
  LoginResponse,
  PaginatedResponse 
} from '@/types/api';

import type {
  TechnicType, InstrumentType, OrderType,
  UserSpecification, CreateUserSpecification,
  UserEmployee, CreateUserEmployee,
  UserOrder, CreateUserOrder,
  UserTechnic, CreateUserTechnic,
  UserInstrument, CreateUserInstrument,
  UserPPE, CreateUserPPE,
  FileInfo, UploadResponse,
  UserDataResponse, UserDataListResponse
} from '@/types/userdata';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface WorkType {
  id: string;
  name: string;
}

interface WorkSubType {
  id: string;
  name: string;
  work_type: string;  // ID типу роботи (виправлено з work_type_id)
  work_type_name: string;
  has_equipment: boolean;
}

interface Equipment {
  id: string;
  name: string;
  subtype: string;  // ID підтипу
  subtype_name: string;
}

interface UserWork {
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

interface CreateUserWork {
  work_type: string;
  work_sub_type: string;
  expiry_date: string;
  permit_file?: File;
}

class ApiClient {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor для додавання токену
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Token ${token}`;
        }
      }
      return config;
    });

    // Response interceptor для обробки помилок
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: RegistrationData) {
    return this.client.post('/auth/register/', data);
  }

  async login(data: LoginData) {
    return this.client.post<LoginResponse>('/auth/login/', data);
  }

  async logout() {
    return this.client.post('/auth/logout/');
  }

  async activate(data: ActivationData) {
    return this.client.post<LoginResponse>('/auth/activate/', data);
  }

  async getProfile() {
    return this.client.get<User>('/auth/profile/');
  }

  async updateProfile(data: Partial<User>) {
    return this.client.patch<User>('/auth/profile/', data);
  }

  // Department endpoints
  async getDepartments() {
    const response = await this.client.get('/auth/departments/');
    // Повертаємо results якщо є пагінація, інакше дані як є
    return {
      data: response.data.results || response.data
    };
  }

  // User management endpoints
  async getUsers(params?: { department?: number; status?: string }) {
    return this.client.get<PaginatedResponse<User>>('/auth/users/', { params });
  }

  async getUser(id: number) {
    return this.client.get<User>(`/auth/users/${id}/`);
  }

  async approveUser(id: number) {
    return this.client.post(`/auth/users/${id}/approve/`);
  }

  async declineUser(id: number, reason?: string) {
    return this.client.post(`/auth/users/${id}/decline/`, { reason });
  }

  // Work Types API
  async getWorkTypes(): Promise<{ data: WorkType[] }> {
    try {
      const response = await this.client.get('/auth/work-types/');
      return { 
        data: Array.isArray(response.data) ? response.data : response.data.results || []
      };
    } catch (error) {
      console.error('Error fetching work types:', error);
      throw error;
    }
  }

  /**
   * Отримати список підтипів робіт
   * @param workTypeId - опціональний фільтр по типу роботи
   */
  async getWorkSubTypes(workTypeId?: string): Promise<{ data: WorkSubType[] }> {
    try {
      // ВИПРАВЛЕНО: використовуємо work_type замість work_type_id
      const params = workTypeId ? { work_type: workTypeId } : {};
      const response = await this.client.get('/auth/work-sub-types/', { params });
      return { 
        data: Array.isArray(response.data) ? response.data : response.data.results || []
      };
    } catch (error) {
      console.error('Error fetching work sub types:', error);
      throw error;
    }
  }

  /**
   * Отримати список обладнання
   * @param subtypeId - опціональний фільтр по підтипу
   */
  async getEquipment(subtypeId?: string): Promise<{ data: Equipment[] }> {
    try {
      const params = subtypeId ? { subtype: subtypeId } : {};
      const response = await this.client.get('/auth/equipment/', { params });
      return { 
        data: Array.isArray(response.data) ? response.data : response.data.results || []
      };
    } catch (error) {
      console.error('Error fetching equipment:', error);
      throw error;
    }
  }

  /**
   * Отримати роботи поточного користувача
   */
  async getUserWorks(): Promise<{ data: UserWork[] }> {
    try {
      const response = await this.client.get('/auth/user-works/');
      return { 
        data: Array.isArray(response.data) ? response.data : response.data.results || []
      };
    } catch (error) {
      console.error('Error fetching user works:', error);
      throw error;
    }
  }

  /**
   * Створити нову роботу для користувача
   */
  async createUserWork(workData: CreateUserWork): Promise<{ data: UserWork }> {
    try {
      const formData = new FormData();
      formData.append('work_type', workData.work_type);
      formData.append('work_sub_type', workData.work_sub_type);
      formData.append('expiry_date', workData.expiry_date);
      
      if (workData.permit_file) {
        formData.append('permit_file', workData.permit_file);
      }

      const response = await this.client.post('/auth/user-works/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return { data: response.data };
    } catch (error) {
      console.error('Error creating user work:', error);
      throw error;
    }
  }

  /**
   * Оновити роботу користувача
   */
  async updateUserWork(workId: string, workData: Partial<CreateUserWork>): Promise<{ data: UserWork }> {
    try {
      const formData = new FormData();
      
      if (workData.work_type) formData.append('work_type', workData.work_type);
      if (workData.work_sub_type) formData.append('work_sub_type', workData.work_sub_type);
      if (workData.expiry_date) formData.append('expiry_date', workData.expiry_date);
      if (workData.permit_file) formData.append('permit_file', workData.permit_file);

      const response = await this.client.patch(`/auth/user-works/${workId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return { data: response.data };
    } catch (error) {
      console.error('Error updating user work:', error);
      throw error;
    }
  }

  /**
   * Видалити роботу користувача
   */
  async deleteUserWork(workId: string): Promise<void> {
    try {
      await this.client.delete(`/auth/user-works/${workId}/`);
    } catch (error) {
      console.error('Error deleting user work:', error);
      throw error;
    }
  }

  // ===================================================================
  // Довідники з детальною інформацією

  /**
   * Отримати типи техніки з документами
   */
  async getTechnicTypesDetail(): Promise<UserDataListResponse<TechnicType>> {
    try {
      const response = await this.client.get('/auth/technic-types-detail/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching technic types detail:', error);
      throw error;
    }
  }

  /**
   * Отримати типи інструментів з документами
   */
  async getInstrumentTypesDetail(): Promise<UserDataListResponse<InstrumentType>> {
    try {
      const response = await this.client.get('/auth/instrument-types-detail/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching instrument types detail:', error);
      throw error;
    }
  }

  /**
   * Отримати типи наказів
   */
  async getOrderTypes(): Promise<UserDataListResponse<OrderType>> {
    try {
      const response = await this.client.get('/auth/order-types/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching order types:', error);
      throw error;
    }
  }

  // ===================================================================
  // Специфікація робіт (таб Роботи)

  /**
   * Отримати специфікацію користувача
   */
  async getUserSpecification(): Promise<UserDataResponse<UserSpecification>> {
    try {
      const response = await this.client.get('/auth/user-specification/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user specification:', error);
      throw error;
    }
  }

  /**
   * Оновити специфікацію користувача
   */
  async updateUserSpecification(data: CreateUserSpecification): Promise<UserDataResponse<UserSpecification>> {
    try {
      const response = await this.client.patch('/auth/user-specification/', data);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating user specification:', error);
      throw error;
    }
  }

  // ===================================================================
  // Співробітники (таб Співробітники)

  /**
   * Отримати список співробітників
   */

  async getUserEmployees() {
    const response = await this.client.get('/auth/user-employees/');
    return { data: response.data.results || response.data };
  }

  /**
   * Створити співробітника
   */
  async createUserEmployee(employeeData: CreateUserEmployee): Promise<UserDataResponse<UserEmployee>> {
  try {
    const formData = new FormData();
    
    // Додаємо текстові поля
    formData.append('name', employeeData.name);
    formData.append('organization_name', employeeData.organization_name);
    formData.append('position', employeeData.position);
    
    // Додаємо дати ТІЛЬКИ якщо вони є
    if (employeeData.medical_exam_date) {
      formData.append('medical_exam_date', employeeData.medical_exam_date);
    }
    if (employeeData.qualification_issue_date) {
      formData.append('qualification_issue_date', employeeData.qualification_issue_date);
    }
    if (employeeData.safety_training_date) {
      formData.append('safety_training_date', employeeData.safety_training_date);
    }
    if (employeeData.special_training_date) {
      formData.append('special_training_date', employeeData.special_training_date);
    }

    // Додаємо файли
    if (employeeData.photo) {
      formData.append('photo', employeeData.photo);
    }
    if (employeeData.qualification_certificate) {
      formData.append('qualification_certificate', employeeData.qualification_certificate);
    }
    if (employeeData.safety_training_certificate) {
      formData.append('safety_training_certificate', employeeData.safety_training_certificate);
    }
    if (employeeData.special_training_certificate) {
      formData.append('special_training_certificate', employeeData.special_training_certificate);
    }

    const response = await this.client.post('/auth/user-employees/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return { data: response.data };
  } catch (error) {
    console.error('Error creating user employee:', error);
    throw error;
  }
}

  /**
   * Оновити співробітника
   */
  async updateUserEmployee(id: string, employeeData: Partial<CreateUserEmployee>): Promise<UserDataResponse<UserEmployee>> {
    try {
      const formData = new FormData();
      
      // Додаємо тільки ті поля, які передані
      Object.entries(employeeData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await this.client.patch(`/auth/user-employees/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return { data: response.data };
    } catch (error) {
      console.error('Error updating user employee:', error);
      throw error;
    }
  }

  /**
   * Видалити співробітника
   */
  async deleteUserEmployee(id: string): Promise<void> {
    try {
      await this.client.delete(`/auth/user-employees/${id}/`);
    } catch (error) {
      console.error('Error deleting user employee:', error);
      throw error;
    }
  }

  // ===================================================================
  // Накази (таб Накази)

  /**
   * Отримати список наказів
   */
  async getUserOrders(): Promise<UserDataListResponse<UserOrder>> {
    try {
      const response = await this.client.get('/auth/user-orders/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  }
/**
 * Створити наказ
 */
async createUserOrder(orderData: CreateUserOrder): Promise<UserDataResponse<UserOrder>> {
  try {
    // Відправляємо JSON з посиланнями на файли (не multipart/form-data)
    const response = await this.client.post('/auth/user-orders/', orderData, {
      headers: {
        'Content-Type': 'application/json', // Важливо: JSON, не multipart
      },
    });
    return { data: response.data };
  } catch (error) {
    console.error('Error creating user order:', error);
    throw error;
  }
}

/**
 * Оновити наказ
 */
async updateUserOrder(id: string, orderData: Partial<CreateUserOrder>): Promise<UserDataResponse<UserOrder>> {
  try {
    // Відправляємо JSON з посиланнями на файли
    const response = await this.client.patch(`/auth/user-orders/${id}/`, orderData, {
      headers: {
        'Content-Type': 'application/json', // JSON, не multipart
      },
    });
    return { data: response.data };
  } catch (error) {
    console.error('Error updating user order:', error);
    throw error;
  }
}
  // ===================================================================
  // Техніка (таб Техніка)

  /**
   * Отримати список техніки
   */
  async getUserTechnics(): Promise<UserDataListResponse<UserTechnic>> {
    try {
      const response = await this.client.get('/auth/user-technics/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user technics:', error);
      throw error;
    }
  }

  /**
   * Створити техніку
   */
  async createUserTechnic(technicData: CreateUserTechnic): Promise<UserDataResponse<UserTechnic>> {
    try {
      const response = await this.client.post('/auth/user-technics/', technicData);
      return { data: response.data };
    } catch (error) {
      console.error('Error creating user technic:', error);
      throw error;
    }
  }

  /**
   * Оновити техніку
   */
  async updateUserTechnic(id: string, technicData: Partial<CreateUserTechnic>): Promise<UserDataResponse<UserTechnic>> {
    try {
      const response = await this.client.patch(`/auth/user-technics/${id}/`, technicData);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating user technic:', error);
      throw error;
    }
  }

  /**
   * Видалити техніку
   */
  async deleteUserTechnic(id: string): Promise<void> {
    try {
      await this.client.delete(`/auth/user-technics/${id}/`);
    } catch (error) {
      console.error('Error deleting user technic:', error);
      throw error;
    }
  }

  // ===================================================================
  // Інструменти (таб Інструменти)

  /**
   * Отримати список інструментів
   */
  async getUserInstruments(): Promise<UserDataListResponse<UserInstrument>> {
    try {
      const response = await this.client.get('/auth/user-instruments/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user instruments:', error);
      throw error;
    }
  }

  /**
   * Створити інструмент
   */
  async createUserInstrument(instrumentData: CreateUserInstrument): Promise<UserDataResponse<UserInstrument>> {
    try {
      const response = await this.client.post('/auth/user-instruments/', instrumentData);
      return { data: response.data };
    } catch (error) {
      console.error('Error creating user instrument:', error);
      throw error;
    }
  }

  /**
   * Оновити інструмент
   */
  async updateUserInstrument(id: string, instrumentData: Partial<CreateUserInstrument>): Promise<UserDataResponse<UserInstrument>> {
    try {
      const response = await this.client.patch(`/auth/user-instruments/${id}/`, instrumentData);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating user instrument:', error);
      throw error;
    }
  }

  /**
   * Видалити інструмент
   */
  async deleteUserInstrument(id: string): Promise<void> {
    try {
      await this.client.delete(`/auth/user-instruments/${id}/`);
    } catch (error) {
      console.error('Error deleting user instrument:', error);
      throw error;
    }
  }

  // ===================================================================
  // ЗІЗ (таб ЗІЗ)

  /**
   * Отримати ЗІЗ користувача
   */
  async getUserPPE(): Promise<UserDataResponse<UserPPE>> {
    try {
      const response = await this.client.get('/auth/user-ppe/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user PPE:', error);
      throw error;
    }
  }

  /**
   * Оновити ЗІЗ користувача
   */
  async updateUserPPE(ppeData: CreateUserPPE): Promise<UserDataResponse<UserPPE>> {
    try {
      const response = await this.client.patch('/auth/user-ppe/', ppeData);
      return { data: response.data };
    } catch (error) {
      console.error('Error updating user PPE:', error);
      throw error;
    }
  }

  // ===================================================================
  // Завантаження файлів

  /**
   * Завантажити окремий документ
   */
  async uploadDocument(file: File, documentType: string = 'general'): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);

      const response = await this.client.post('/auth/upload-document/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();