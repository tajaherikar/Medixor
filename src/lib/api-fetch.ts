/**
 * Safe API fetch helpers with authentication
 * Ensures queries always return proper types even on auth errors
 */

/**
 * Safely fetch data from API endpoint
 * Returns empty array on error (401/403) instead of throwing
 */
export async function safeFetchArray<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, {
      credentials: 'same-origin', // Include cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      // Log auth errors for debugging
      if (res.status === 401 || res.status === 403) {
        console.warn(`[Auth] ${res.status} for ${url} - User may need to login`);
      } else {
        console.error(`[API] ${res.status} ${res.statusText} for ${url}`);
      }
      return [];
    }
    
    const data = await res.json();
    // Ensure we always return an array
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[API] Error fetching ${url}:`, error);
    return [];
  }
}

/**
 * Safely fetch single object from API
 * Returns null on error instead of throwing
 */
export async function safeFetchObject<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.warn(`[Auth] ${res.status} for ${url} - User may need to login`);
      } else {
        console.error(`[API] ${res.status} ${res.statusText} for ${url}`);
      }
      return null;
    }
    
    return res.json();
  } catch (error) {
    console.error(`[API] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * POST data to API endpoint
 * Throws on error for proper mutation error handling
 */
export async function safePost<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.statusText}`);
  }
  
  return res.json();
}

/**
 * PATCH data to API endpoint
 */
export async function safePatch<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.statusText}`);
  }
  
  return res.json();
}

/**
 * DELETE from API endpoint
 */
export async function safeDelete(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.statusText}`);
  }
}
