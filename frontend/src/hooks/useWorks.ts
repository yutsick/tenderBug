// frontend/src/hooks/useWorks.ts

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { WorkType, WorkSubType, Equipment, UserWork, CreateUserWork } from '@/types/works';

export function useWorkTypes() {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkTypes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getWorkTypes();
      setWorkTypes(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження типів робіт');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkTypes();
  }, []);

  return { workTypes, loading, error, refetch: fetchWorkTypes };
}

export function useWorkSubTypes(workTypeId?: string) {
  const [workSubTypes, setWorkSubTypes] = useState<WorkSubType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkSubTypes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getWorkSubTypes(workTypeId);
      setWorkSubTypes(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження підтипів робіт');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkSubTypes();
  }, [workTypeId]);

  return { workSubTypes, loading, error, refetch: fetchWorkSubTypes };
}

export function useEquipment(subtypeId?: string) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getEquipment(subtypeId);
      setEquipment(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження обладнання');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subtypeId) {
      fetchEquipment();
    } else {
      setEquipment([]);
    }
  }, [subtypeId]);

  return { equipment, loading, error, refetch: fetchEquipment };
}

export function useUserWorks() {
  const [userWorks, setUserWorks] = useState<UserWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserWorks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getUserWorks();
      setUserWorks(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження робіт');
    } finally {
      setLoading(false);
    }
  };

  const createWork = async (workData: CreateUserWork) => {
    try {
      const response = await apiClient.createUserWork(workData);
      setUserWorks(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const deleteWork = async (workId: string) => {
    try {
      await apiClient.deleteUserWork(workId);
      setUserWorks(prev => prev.filter(work => work.id !== workId));
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchUserWorks();
  }, []);

  return { 
    userWorks, 
    loading, 
    error, 
    refetch: fetchUserWorks,
    createWork,
    deleteWork
  };
}