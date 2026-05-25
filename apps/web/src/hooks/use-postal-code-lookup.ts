import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

export type PostalCodeLookup = {
  postalCode: string;
  city: string;
  district: string;
  state: string;
  country: string;
};

export function normalizePostalCodeInput(value: string): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, 6);
}

export function usePostalCodeLookup(postalCode: string) {
  const normalizedPostalCode = useMemo(() => normalizePostalCodeInput(postalCode), [postalCode]);
  const [debouncedPostalCode, setDebouncedPostalCode] = useState(normalizedPostalCode);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPostalCode(normalizedPostalCode), 350);
    return () => window.clearTimeout(timer);
  }, [normalizedPostalCode]);

  const query = useQuery({
    queryKey: ['postal-code-lookup', debouncedPostalCode],
    queryFn: async () => {
      const res = await api.get(`/postal-codes/${debouncedPostalCode}`);
      return (res.data.data ?? res.data) as PostalCodeLookup;
    },
    enabled: debouncedPostalCode.length === 6,
    retry: 1,
    staleTime: 12 * 60 * 60 * 1000,
  });

  return {
    ...query,
    normalizedPostalCode,
    errorMessage:
      debouncedPostalCode.length === 6 && query.error
        ? getApiErrorMessage(query.error, 'Could not fetch city from postal code.')
        : null,
  };
}
