// API client to replace Supabase calls
class ApiClient {
  private baseUrl = '/api';

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Products
  async getProducts() {
    return this.get('/products');
  }

  async getProduct(id: string) {
    return this.get(`/products/${id}`);
  }

  // Paystack
  async initializePayment(data: {
    email: string;
    amount: number;
    productId?: string;
    planId?: string;
    referralCode?: string;
  }) {
    return this.post('/paystack/initialize', data);
  }

  // Bank verification
  async verifyBankDetails(data: { account_number: string; bank_code: string }) {
    return this.post('/verify-bank-details', data);
  }

  // Get banks
  async getBanks() {
    return this.get('/paystack/banks');
  }

  // Subscriptions
  async getSubscriptionPlans() {
    return this.get('/subscription-plans');
  }

  async getUserSubscription(userId: string) {
    return this.get(`/user-subscriptions/${userId}`);
  }

  async createFreeSubscription(planId: string, userId: string) {
    return this.post('/create-free-subscription', { planId, userId });
  }
}

export const api = new ApiClient();