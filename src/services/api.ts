import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Company ID injection
// Screens never need to pass company_id manually — the interceptors below
// automatically attach it to every outgoing request.
// ---------------------------------------------------------------------------
let _companyId: string | null = null;

export function setApiCompanyId(id: string | null) {
  _companyId = id;
}

// REQUEST interceptor — inject company_id
api.interceptors.request.use((config) => {
  if (!_companyId) return config;

  const method = (config.method ?? 'get').toLowerCase();

  if (method === 'get' || method === 'delete') {
    // Append as a query param
    config.params = { ...config.params, company_id: _companyId };
  } else {
    // Merge into JSON body for POST / PUT / PATCH
    if (config.data && typeof config.data === 'object') {
      config.data = { ...config.data, company_id: _companyId };
    } else if (!config.data) {
      config.data = { company_id: _companyId };
    }
  }

  return config;
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
  is_gst_bill?: boolean;
  cgst_percent?: number;
  sgst_percent?: number;
  invoice_number?: string;
  freight_charges?: number;
}

export interface UpdateBillPayload {
  party_id?: number;
  entity_id?: number;
  items?: BillItem[];
  discounts?: number[];
  bill_date?: string;
  note?: string | null;
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

  updateBill: (id: number, data: UpdateBillPayload) =>
    api.put(`/bills/${id}`, data),

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
// Party Service
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
