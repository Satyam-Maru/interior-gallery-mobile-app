import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BillItem {
  product_id: number;
  quantity: number;
  price: number;
}

export interface CreateBillPayload {
  type: 'purchase' | 'sell' | 'purchase_return' | 'sell_return';
  party_id?: number;
  entity_id?: number;
  items: BillItem[];
  discounts: number[];
  original_bill_id?: number;
  bill_date?: string;
  note?: string;
}

export interface CreatePaymentPayload {
  bill_id: number;
  party_id?: number;
  entity_id?: number;
  amount: number;
  mode: 'cash' | 'online';
  paid_at?: string;
  note?: string;
}

export interface BillFilters {
  type?: 'purchase' | 'sell' | 'purchase_return' | 'sell_return';
  party_id?: number | string;
  entity_id?: number | string;
  startDate?: string;
  endDate?: string;
}

// ---------------------------------------------------------------------------
// Bill Service
// ---------------------------------------------------------------------------
export const BillService = {
  getBills: (filters?: BillFilters) =>
    api.get('/bills', { params: filters }),

  getBillById: (id: number) =>
    api.get(`/bills/${id}`),

  createBill: (data: CreateBillPayload) =>
    api.post('/bills', data),

  createPayment: (data: CreatePaymentPayload) =>
    api.post('/bills/payments', data),

  getOutstanding: (partyId: number) =>
    api.get(`/bills/outstanding/${partyId}`),
};

// ---------------------------------------------------------------------------
// Product Service
// ---------------------------------------------------------------------------
export const ProductService = {
  getProducts: () => api.get('/products'),
  createProduct: (data: {
    name: string;
    code?: string;
    unit?: string;
    price: number;
    quantity: number;
    category_id: number;
  }) => api.post('/products', data),
  updateProduct: (id: number, data: {
    name?: string;
    code?: string;
    unit?: string;
    price?: number;
    quantity?: number;
    category_id?: number;
  }) => api.put(`/products/${id}`, data),
};

// ---------------------------------------------------------------------------
// Party Service (replaces EntityService)
// ---------------------------------------------------------------------------
export const PartyService = {
  getParties: () => api.get('/parties'),
  createParty: (data: { name: string }) => api.post('/parties', data),
  updateParty: (id: number, data: { name: string }) => api.put(`/parties/${id}`, data),
  deleteParty: (id: number) => api.delete(`/parties/${id}`),
};

// Backward-compatibility alias
export const EntityService = {
  getEntities: PartyService.getParties,
  createEntity: PartyService.createParty,
  updateEntity: PartyService.updateParty,
  deleteEntity: PartyService.deleteParty,
};

// ---------------------------------------------------------------------------
// Category Service
// ---------------------------------------------------------------------------
export const CategoryService = {
  getCategories: () => api.get('/categories'),
  createCategory: (data: { name: string }) => api.post('/categories', data),
  updateCategory: (id: number, data: { name: string }) => api.put(`/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/categories/${id}`),
};

// ---------------------------------------------------------------------------
// Dashboard Service
// ---------------------------------------------------------------------------
export const DashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
