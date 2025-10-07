// src/hooks/useUserData.ts - ПОВНА ВЕРСІЯ
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type {
  TechnicType, InstrumentType, OrderType,
  UserSpecification, CreateUserSpecification,
  UserEmployee, CreateUserEmployee,
  UserOrder, CreateUserOrder,
  UserTechnic, CreateUserTechnic,
  UserInstrument, CreateUserInstrument,
  UserPPE, CreateUserPPE,
  LoadingState, MutationState
} from '@/types/userdata';

// ===================================================================
// Хуки для довідників

export function useTechnicTypes() {
  const [technicTypes, setTechnicTypes] = useState<TechnicType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTechnicTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getTechnicTypesDetail();
      const technicTypesData = Array.isArray(response.data)
        ? response.data
        : (response.data && 'results' in response.data)
          ? response.data.results
          : [];
      setTechnicTypes(Array.isArray(technicTypesData) ? technicTypesData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження типів техніки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTechnicTypes();
  }, [fetchTechnicTypes]);

  return { technicTypes, loading, error, refetch: fetchTechnicTypes };
}

export function useInstrumentTypes() {
  const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstrumentTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getInstrumentTypesDetail();
      const instrumentTypesData = Array.isArray(response.data)
        ? response.data
        : (response.data && 'results' in response.data)
          ? response.data.results
          : [];
      setInstrumentTypes(Array.isArray(instrumentTypesData) ? instrumentTypesData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження типів інструментів');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstrumentTypes();
  }, [fetchInstrumentTypes]);

  return { instrumentTypes, loading, error, refetch: fetchInstrumentTypes };
}

export function useOrderTypes() {
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getOrderTypes();
      const orderTypesData = Array.isArray(response.data)
        ? response.data
        : (response.data && 'results' in response.data)
          ? response.data.results
          : [];
      setOrderTypes(Array.isArray(orderTypesData) ? orderTypesData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження типів наказів');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrderTypes();
  }, [fetchOrderTypes]);

  return { orderTypes, loading, error, refetch: fetchOrderTypes };
}

// ===================================================================
// Хук для специфікації робіт (таб Роботи)

export function useUserSpecification() {
  const [specification, setSpecification] = useState<UserSpecification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchSpecification = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getUserSpecification();
      setSpecification(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження специфікації');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSpecification = useCallback(async (data: CreateUserSpecification) => {
    setSaving(true);
    setSaveError(null);
    
    try {
      const response = await apiClient.updateUserSpecification(data);
      setSpecification(response.data);
      return response.data;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Помилка збереження специфікації');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecification();
  }, [fetchSpecification]);

  return {
    specification,
    loading,
    error,
    saving,
    saveError,
    updateSpecification,
    refetch: fetchSpecification
  };
}

// ===================================================================
// Хук для співробітників (таб Співробітники)

export function useUserEmployees() {
  const [employees, setEmployees] = useState<UserEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const fetchEmployees = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await apiClient.getUserEmployees();
    
    // ✅ ВИПРАВЛЕННЯ: API повертає пагіновані дані
    const employeesData = response.data.results || response.data;
    setEmployees(Array.isArray(employeesData) ? employeesData : []);
    
    console.log('✅ Співробітники завантажені:', employeesData); // DEBUG
  } catch (err) {
    console.error('❌ Помилка завантаження співробітників:', err); // DEBUG
    setError(err instanceof Error ? err.message : 'Помилка завантаження співробітників');
  } finally {
    setLoading(false);
  }
}, []);

  const createEmployee = useCallback(async (employeeData: CreateUserEmployee) => {
    setMutating(true);
    
    try {
      const response = await apiClient.createUserEmployee(employeeData);
      setEmployees(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const updateEmployee = useCallback(async (id: string, employeeData: Partial<CreateUserEmployee>) => {
    setMutating(true);
    
    try {
      const response = await apiClient.updateUserEmployee(id, employeeData);
      setEmployees(prev => prev.map(emp => emp.id === id ? response.data : emp));
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    setMutating(true);
    
    try {
      await apiClient.deleteUserEmployee(id);
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    error,
    mutating,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  };
}

// ===================================================================
// Хук для наказів (таб Накази)

export function useUserOrders() {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const fetchOrders = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await apiClient.getUserOrders();

    // API тепер повертає масив напряму (без пагінації)
    let ordersData = response.data;

    // Якщо все ще є пагінація (для сумісності)
    if (ordersData && typeof ordersData === 'object' && 'results' in ordersData) {
      ordersData = ordersData.results;
    }

    setOrders(Array.isArray(ordersData) ? ordersData : []);
    console.log('✅ Накази завантажені:', ordersData.length, 'шт.'); // DEBUG
  } catch (err) {
    console.error('❌ Помилка завантаження наказів:', err); // DEBUG
    setError(err instanceof Error ? err.message : 'Помилка завантаження наказів');
  } finally {
    setLoading(false);
  }
}, []);

  const createOrder = useCallback(async (orderData: CreateUserOrder) => {
    setMutating(true);
    
    try {
      const response = await apiClient.createUserOrder(orderData);
      setOrders(prev => [...(Array.isArray(prev) ? prev : []), response.data]);  // Захист від undefined
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const updateOrder = useCallback(async (id: string, orderData: Partial<CreateUserOrder>) => {
    setMutating(true);
    
    try {
      const response = await apiClient.updateUserOrder(id, orderData);
      setOrders(prev => (Array.isArray(prev) ? prev : []).map(order => order.id === id ? response.data : order));  // Захист від undefined
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    setMutating(true);

    try {
      console.log('🗑️ Видалення наказу з ID:', id);
      await apiClient.deleteUserOrder(id);
      setOrders(prev => {
        const filtered = (Array.isArray(prev) ? prev : []).filter(order => order.id !== id);
        console.log('✅ Наказ видалено. Залишилось наказів:', filtered.length);
        return filtered;
      });
    } catch (err) {
      console.error('❌ Помилка видалення наказу:', err);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    mutating,
    createOrder,
    updateOrder,
    deleteOrder,
    refetch: fetchOrders
  };
}

// ===================================================================
// Хук для техніки (таб Техніка)

export function useUserTechnics() {
  const [technics, setTechnics] = useState<UserTechnic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

const fetchTechnics = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await apiClient.getUserTechnics();
    
    // ✅ ВИПРАВЛЕННЯ: API повертає пагіновані дані
    const technicsData = Array.isArray(response.data)
      ? response.data
      : (response.data && 'results' in response.data)
        ? response.data.results
        : [];
    setTechnics(Array.isArray(technicsData) ? technicsData : []);
    
    console.log('✅ Техніка завантажена:', technicsData); // DEBUG
  } catch (err) {
    console.error('❌ Помилка завантаження техніки:', err); // DEBUG
    setError(err instanceof Error ? err.message : 'Помилка завантаження техніки');
  } finally {
    setLoading(false);
  }
}, []);

  const createTechnic = useCallback(async (technicData: CreateUserTechnic) => {
    setMutating(true);
    
    try {
      const response = await apiClient.createUserTechnic(technicData);
      setTechnics(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const updateTechnic = useCallback(async (id: string, technicData: Partial<CreateUserTechnic>) => {
    setMutating(true);
    
    try {
      const response = await apiClient.updateUserTechnic(id, technicData);
      setTechnics(prev => prev.map(tech => tech.id === id ? response.data : tech));
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const deleteTechnic = useCallback(async (id: string) => {
    setMutating(true);
    
    try {
      await apiClient.deleteUserTechnic(id);
      setTechnics(prev => prev.filter(tech => tech.id !== id));
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  useEffect(() => {
    fetchTechnics();
  }, [fetchTechnics]);

  return {
    technics,
    loading,
    error,
    mutating,
    createTechnic,
    updateTechnic,
    deleteTechnic,
    refetch: fetchTechnics
  };
}

// ===================================================================
// Хук для інструментів (таб Інструменти)

export function useUserInstruments() {
  const [instruments, setInstruments] = useState<UserInstrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

const fetchInstruments = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await apiClient.getUserInstruments();

    const instrumentsData = (response.data as any).results || response.data;
    setInstruments(Array.isArray(instrumentsData) ? instrumentsData : []);

  } catch (err) {

    setError(err instanceof Error ? err.message : 'Помилка завантаження інструментів');
  } finally {
    setLoading(false);
  }
}, []);
  const createInstrument = useCallback(async (instrumentData: CreateUserInstrument) => {
    setMutating(true);
    
    try {
      const response = await apiClient.createUserInstrument(instrumentData);
      setInstruments(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const updateInstrument = useCallback(async (id: string, instrumentData: Partial<CreateUserInstrument>) => {
    setMutating(true);
    
    try {
      const response = await apiClient.updateUserInstrument(id, instrumentData);
      setInstruments(prev => prev.map(inst => inst.id === id ? response.data : inst));
      return response.data;
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const deleteInstrument = useCallback(async (id: string) => {
    setMutating(true);
    
    try {
      await apiClient.deleteUserInstrument(id);
      setInstruments(prev => prev.filter(inst => inst.id !== id));
    } catch (err) {
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  return {
    instruments,
    loading,
    error,
    mutating,
    createInstrument,
    updateInstrument,
    deleteInstrument,
    refetch: fetchInstruments
  };
}

// ===================================================================
// Хук для ЗІЗ (таб ЗІЗ)

export function useUserPPE() {
  const [ppe, setPPE] = useState<UserPPE | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchPPE = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
        const response = await apiClient.getUserPPE();
        
        // ✅ ВИПРАВЛЕННЯ: API повертає пагіновані дані для ЗІЗ
        const ppeData = (response.data as any).results ? (response.data as any).results[0] : response.data;
        setPPE(ppeData || null);
        
        console.log('✅ ЗІЗ завантажено:', ppeData); // DEBUG
    } catch (err) {
        console.error('❌ Помилка завантаження ЗІЗ:', err); // DEBUG
        setError(err instanceof Error ? err.message : 'Помилка завантаження ЗІЗ');
    } finally {
        setLoading(false);
    }
    }, []);

  const updatePPE = useCallback(async (data: CreateUserPPE) => {
    setSaving(true);
    setSaveError(null);
    
    try {
      const response = await apiClient.updateUserPPE(data);
      setPPE(response.data);
      return response.data;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Помилка збереження ЗІЗ');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    fetchPPE();
  }, [fetchPPE]);

  return {
    ppe,
    loading,
    error,
    saving,
    saveError,
    updatePPE,
    refetch: fetchPPE
  };
}

// ===================================================================
// Комбінований хук для отримання статусу всіх табів

export function useUserDataSummary() {
  const { specification } = useUserSpecification();
  const { employees } = useUserEmployees();
  const { orders } = useUserOrders();
  const { technics } = useUserTechnics();
  const { instruments } = useUserInstruments();
  const { ppe } = useUserPPE();

  return {
    specification: {
      hasData: !!specification?.specification_type,
      isValid: !!specification?.specification_type?.trim(),
      lastUpdated: specification?.updated_at
    },
    employees: {
      hasData: employees.length > 0,
      isValid: employees.length > 0 && employees.every(emp => emp.name?.trim()),
      lastUpdated: employees[0]?.updated_at
    },
    orders: {
      hasData: orders.length > 0,
      isValid: orders.length > 0 && orders.every(order => order.documents?.length > 0),
      lastUpdated: orders[0]?.updated_at
    },
    technics: {
      hasData: technics.length > 0,
      isValid: technics.length > 0 && technics.every(tech => tech.display_name?.trim()),
      lastUpdated: technics[0]?.updated_at
    },
    instruments: {
      hasData: instruments.length > 0,
      isValid: instruments.length > 0 && instruments.every(inst => inst.display_name?.trim()),
      lastUpdated: instruments[0]?.updated_at
    },
    ppe: {
      hasData: !!ppe?.documents?.length,
      isValid: !!ppe?.documents?.length,
      lastUpdated: ppe?.updated_at
    }
  };
}