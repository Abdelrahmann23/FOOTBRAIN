// API service for backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        return {
          error: text || 'Server returned non-JSON response',
        };
      }

      if (!response.ok) {
        // Log detailed error for debugging
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          data,
          endpoint,
        });
        return {
          error: data.error || data.message || data.details || `Error: ${response.status} ${response.statusText}`,
        };
      }

      return { data: data as T };
    } catch (error) {
      console.error('API request error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          error: 'Cannot connect to server. Make sure the backend server is running on http://localhost:3000',
        };
      }
      return {
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async signup(email: string, password: string, name: string, teamName: string) {
    return this.request<{ token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, teamName }),
    });
  }

  async verifyToken() {
    return this.request<{ user: any }>('/auth/verify', {
      method: 'GET',
    });
  }

  // AI endpoints
  async predictMarketValue(player: any) {
    return this.request<{
      playerId: string;
      predictedValue: number;
      valueRange: { min: number; max: number };
      valueFactors: Array<{ factor: string; contribution: number; trend: 'up' | 'down' | 'stable' }>;
      comparablePlayers: Array<{ name: string; value: number; similarity: number }>;
      modelConfidence: number;
      timestamp: string;
    }>('/ai/predict/market-value', {
      method: 'POST',
      body: JSON.stringify({ player }),
    });
  }

  /** Injury prediction uses physical attributes only (height, weight, age, BMI, hamstring, sprint speed, training hours). */
  async predictInjury(payload: {
    playerId?: string;
    physical: {
      age: number;
      height: number;
      weight: number;
      bmi?: number;
      hamstring: number;
      sprint_speed: number;
      training_hours: number;
    };
  }) {
    return this.request<{
      playerId: string;
      riskProbability: number;
      riskLevel: 'low' | 'medium' | 'high';
      topRiskFactors: Array<{ factor: string; impact: number; description: string }>;
      recommendations: string[];
      modelConfidence: number;
      timestamp: string;
    }>('/ai/predict/injury', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Player endpoints
  async getMyPlayers() {
    return this.request<{ players: any[] }>('/players', {
      method: 'GET',
    });
  }

  async createPlayer(player: any) {
    return this.request<{ player: any }>('/players', {
      method: 'POST',
      body: JSON.stringify(player),
    });
  }

  // Admin endpoints
  async getAdminUsers() {
    return this.request<{ users: any[] }>('/admin/users', {
      method: 'GET',
    });
  }

  async createAdminUser(payload: {
    email: string;
    password: string;
    name: string;
    role: string;
    teamName: string;
  }) {
    return this.request<{ user: any; message: string }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAdminUser(email: string, updates: any) {
    return this.request<{ user: any; message: string }>(
      `/admin/users/${encodeURIComponent(email)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  }

  async deleteAdminUser(email: string) {
    return this.request<{ message: string }>(
      `/admin/users/${encodeURIComponent(email)}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getAdminStats() {
    return this.request<{ totalUsers: number; totalPlayers: number }>('/admin/stats', {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();
