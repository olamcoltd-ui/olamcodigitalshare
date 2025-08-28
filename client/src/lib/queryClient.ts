import { QueryClient } from '@tanstack/react-query';

// Custom fetch function for API requests
export async function apiRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(`${response.status}: ${errorData.error || 'Request failed'}`);
  }

  return response.json();
}

// Query client with default configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey, signal }) => {
        const [url, ...params] = queryKey as [string, ...any[]];
        
        // Build URL with parameters if provided
        let fullUrl = url;
        if (params.length > 0 && params[0]) {
          fullUrl += `/${params[0]}`;
        }

        return apiRequest(fullUrl, { signal });
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error.message.includes('401')) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});