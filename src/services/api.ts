import axios from 'axios';

// Replace with your local machine IP or hosted API URL in .env file
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL; 

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const StockService = {
  getHistory: (params?: { startDate?: string; endDate?: string; productId?: number; entityId?: number }) => 
    api.get('/stock', { params }),
  createStock: (data: {
    type: 'purchase' | 'sell';
    quantity: number;
    price: number;
    discount?: number;
    product_id: number;
    entity_id: number;
  }) => api.post('/stock', data),
};

export const ProductService = {
  getProducts: () => api.get('/products'),
  createProduct: (data: {
    name: string;
    unit?: string;
    price: number;
    quantity: number;
    category_id: number;
  }) => api.post('/products', data),
  updateProduct: (id: number, data: {
    name?: string;
    unit?: string;
    price?: number;
    quantity?: number;
    category_id?: number;
  }) => api.put(`/products/${id}`, data),
};

export const EntityService = {
  getEntities: () => api.get('/entities'),
  createEntity: (data: {
    name: string;
    type: 'supplier' | 'customer';
    location_id?: number;
  }) => api.post('/entities', data),
};

export const CategoryService = {
  getCategories: () => api.get('/categories'),
  createCategory: (data: { name: string }) => api.post('/categories', data),
};

export const LocationService = {
  getLocations: () => api.get('/locations'),
  createLocation: (data: { name: string }) => api.post('/locations', data),
};

export default api;
