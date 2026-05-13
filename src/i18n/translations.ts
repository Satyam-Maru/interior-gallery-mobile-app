export type Language = 'en' | 'gu';

// Gujarati numeral conversion
const GU_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];

export const toGujaratiNumerals = (value: string | number): string => {
  return String(value).replace(/[0-9]/g, (d) => GU_DIGITS[parseInt(d)]);
};

export const formatCurrency = (value: number | string, lang: Language): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = num.toLocaleString();
  return lang === 'gu' ? `₹${toGujaratiNumerals(formatted)}` : `₹${formatted}`;
};

export const formatNumber = (value: number | string, lang: Language): string => {
  const formatted = String(value);
  return lang === 'gu' ? toGujaratiNumerals(formatted) : formatted;
};

// Days and months for Gujarati date
const GU_DAYS = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરૂવાર', 'શુક્રવાર', 'શનિવાર'];
const GU_MONTHS = [
  'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
];

export const getFormattedDate = (lang: Language): string => {
  const days_en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months_en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  if (lang === 'gu') {
    const day = GU_DAYS[now.getDay()];
    const date = toGujaratiNumerals(now.getDate());
    const month = GU_MONTHS[now.getMonth()];
    const year = toGujaratiNumerals(now.getFullYear());
    return `${day}, ${date} ${month} ${year}`;
  }
  return `${days_en[now.getDay()]}, ${now.getDate()} ${months_en[now.getMonth()]} ${now.getFullYear()}`;
};

export interface Translations {
  // ── Tab bar ──────────────────────────────────────────────
  tabDashboard: string;
  tabProducts: string;
  tabManagement: string;
  tabStock: string;
  tabHistory: string;

  // ── Dashboard ────────────────────────────────────────────
  overview: string;
  totalStock: string;
  totalHistory: string;
  purchases: string;
  sales: string;
  last7DaysTrend: string;
  stockByCategory: string;
  updatingStatistics: string;
  noCategoryData: string;

  // ── Products ─────────────────────────────────────────────
  inventory: string;
  searchProducts: string;
  category: string;
  allCategories: string;
  filterCategory: string;
  editProduct: string;
  newProduct: string;
  updateProductInfo: string;
  enterDetailsNewStock: string;
  productName: string;
  unit: string;
  initialStock: string;
  basePrice: string;
  selectCategory: string;
  saveChanges: string;
  addProduct: string;
  discard: string;
  selectCategoryTitle: string;
  searchOrAddNew: string;
  addAsNewCategory: string;
  uncategorized: string;
  units: string;

  // ── Stock Entry ──────────────────────────────────────────
  stockEntry: string;
  purchase: string;
  sell: string;
  product: string;
  partySupplierCustomer: string;
  selectProduct: string;
  selectParty: string;
  quantity: string;
  price: string;
  discountPercent: string;
  totalEstimate: string;
  confirmPurchase: string;
  confirmSale: string;
  searchProduct: string;
  stock: string;
  searchByName: string;

  // ── History ──────────────────────────────────────────────
  history: string;
  filters: string;
  totalSales: string;
  totalBuy: string;
  netBalance: string;
  exportBtn: string;
  transactionDetails: string;
  productLabel: string;
  partyLabel: string;
  typeLabel: string;
  dateTimeLabel: string;
  unitPrice: string;
  quantityLabel: string;
  discountLabel: string;
  totalAmount: string;
  done: string;
  filtersTitle: string;
  dateRange: string;
  allTime: string;
  customDateRange: string;
  fromDate: string;
  toDate: string;
  allProducts: string;
  allParties: string;
  clearAll: string;
  apply: string;
  searchProductFilter: string;
  searchPartyFilter: string;

  // ── Management ───────────────────────────────────────────
  management: string;
  suppliers: string;
  customers: string;
  categories: string;
  locations: string;
  noLocation: string;
  supplier: string;
  customer: string;
  name: string;
  location: string;
  selectLocation: string;
  searchLocations: string;
  noLocationsFound: string;
  saveItem: string;
  edit: string;
  new: string;
  updateDetailsFor: string;
  registerNew: string;
  search: string;

  // ── Common ───────────────────────────────────────────────
  loading: string;
  fetchFailed: string;
  couldNotLoad: string;
  validationError: string;
  saveFailed: string;
  success: string;
  updated: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Tab bar
    tabDashboard: 'Dashboard',
    tabProducts: 'Products',
    tabManagement: 'Management',
    tabStock: 'Stock',
    tabHistory: 'History',

    // Dashboard
    overview: 'Overview',
    totalStock: 'Total Stock',
    totalHistory: 'Total History',
    purchases: 'Purchases',
    sales: 'Sales',
    last7DaysTrend: 'Last 7 Days Trend',
    stockByCategory: 'Stock by Category',
    updatingStatistics: 'Updating statistics...',
    noCategoryData: 'No category data available',

    // Products
    inventory: 'Inventory',
    searchProducts: 'Search products...',
    category: 'Category',
    allCategories: 'All Categories',
    filterCategory: 'Filter Category',
    editProduct: 'Edit Product',
    newProduct: 'New Product',
    updateProductInfo: 'Update product information',
    enterDetailsNewStock: 'Enter details to register new stock',
    productName: 'Product Name *',
    unit: 'Unit',
    initialStock: 'Initial Stock *',
    basePrice: 'Base Price *',
    selectCategory: 'Select Category',
    saveChanges: 'Save Changes',
    addProduct: 'Add Product',
    discard: 'Discard',
    selectCategoryTitle: 'Select Category',
    searchOrAddNew: 'Search or add new...',
    addAsNewCategory: 'Add "{query}" as new category',
    uncategorized: 'Uncategorized',
    units: 'units',

    // Stock Entry
    stockEntry: 'Stock Entry',
    purchase: 'Purchase',
    sell: 'Sell',
    product: 'Product *',
    partySupplierCustomer: 'Party (Supplier/Customer) *',
    selectProduct: 'Select Product',
    selectParty: 'Select Party',
    quantity: 'Quantity *',
    price: 'Price *',
    discountPercent: 'Discount (%)',
    totalEstimate: 'Total Estimate',
    confirmPurchase: 'Confirm Purchase',
    confirmSale: 'Confirm Sale',
    searchProduct: 'Search product...',
    stock: 'Stock',
    searchByName: 'Search by name...',

    // History
    history: 'History',
    filters: 'Filters',
    totalSales: 'Total Sales',
    totalBuy: 'Total Buy',
    netBalance: 'Net Balance',
    exportBtn: 'Export',
    transactionDetails: 'Transaction Details',
    productLabel: 'PRODUCT',
    partyLabel: 'PARTY',
    typeLabel: 'TYPE',
    dateTimeLabel: 'DATE & TIME',
    unitPrice: 'Unit Price',
    quantityLabel: 'Quantity',
    discountLabel: 'Discount',
    totalAmount: 'Total Amount',
    done: 'Done',
    filtersTitle: 'Filters',
    dateRange: 'Date Range',
    allTime: 'All Time',
    customDateRange: 'Custom Date Range',
    fromDate: 'From',
    toDate: 'To',
    allProducts: 'All Products',
    allParties: 'All Parties',
    clearAll: 'Clear All',
    apply: 'Apply',
    searchProductFilter: 'Search product...',
    searchPartyFilter: 'Search party...',

    // Management
    management: 'Management',
    suppliers: 'Suppliers',
    customers: 'Customers',
    categories: 'Categories',
    locations: 'Locations',
    noLocation: 'No location',
    supplier: 'Supplier',
    customer: 'Customer',
    name: 'Name *',
    location: 'Location',
    selectLocation: 'Select Location',
    searchLocations: 'Search locations...',
    noLocationsFound: 'No locations found',
    saveItem: 'Save',
    edit: 'Edit',
    new: 'New',
    updateDetailsFor: 'Update details for this',
    registerNew: 'Register a new',
    search: 'Search...',

    // Common
    loading: 'Loading...',
    fetchFailed: 'Fetch Failed',
    couldNotLoad: 'Could not load data',
    validationError: 'Validation Error',
    saveFailed: 'Save Failed',
    success: 'Success',
    updated: 'Updated',
  },

  gu: {
    // Tab bar
    tabDashboard: 'ડૅશબોર્ડ',
    tabProducts: 'ઉત્પાદનો',
    tabManagement: 'વ્યવસ્થાપન',
    tabStock: 'સ્ટૉક',
    tabHistory: 'ઇતિહાસ',

    // Dashboard
    overview: 'સારાંશ',
    totalStock: 'કુલ સ્ટૉક',
    totalHistory: 'કુલ ઇતિહાસ',
    purchases: 'ખરીદી',
    sales: 'વેચાણ',
    last7DaysTrend: 'છેલ્લા ૭ દિવસનો ટ્રૅન્ડ',
    stockByCategory: 'શ્રેણી મુજબ સ્ટૉક',
    updatingStatistics: 'આંકડા અપડેટ થઈ રહ્યા છે...',
    noCategoryData: 'કોઈ શ્રેણી ડૅટા ઉપલબ્ધ નથી',

    // Products
    inventory: 'ઇન્વેન્ટરી',
    searchProducts: 'ઉત્પાદન શોધો...',
    category: 'શ્રેણી',
    allCategories: 'બધી શ્રેણીઓ',
    filterCategory: 'શ્રેણી ફિલ્ટર',
    editProduct: 'ઉત્પાદન સંપાદિત કરો',
    newProduct: 'નવું ઉત્પાદન',
    updateProductInfo: 'ઉત્પાદનની માહિતી અપડેટ કરો',
    enterDetailsNewStock: 'નવા સ્ટૉક માટે વિગત દાખલ કરો',
    productName: 'ઉત્પાદનનું નામ *',
    unit: 'એકમ',
    initialStock: 'પ્રારંભિક સ્ટૉક *',
    basePrice: 'આધાર ભાવ *',
    selectCategory: 'શ્રેણી પસંદ કરો',
    saveChanges: 'ફેરફાર સાચવો',
    addProduct: 'ઉત્પાદન ઉમેરો',
    discard: 'રદ કરો',
    selectCategoryTitle: 'શ્રેણી પસંદ કરો',
    searchOrAddNew: 'શોધો અથવા નવું ઉમેરો...',
    addAsNewCategory: '"{query}" ને નવી શ્રેણી તરીકે ઉમેરો',
    uncategorized: 'વર્ગીકૃત નથી',
    units: 'એકમ',

    // Stock Entry
    stockEntry: 'સ્ટૉક એન્ટ્રી',
    purchase: 'ખરીદી',
    sell: 'વેચાણ',
    product: 'ઉત્પાદન *',
    partySupplierCustomer: 'પાર્ટી (સપ્લાયર/ગ્રાહક) *',
    selectProduct: 'ઉત્પાદન પસંદ કરો',
    selectParty: 'પાર્ટી પસંદ કરો',
    quantity: 'જથ્થો *',
    price: 'ભાવ *',
    discountPercent: 'ડિસ્કાઉન્ટ (%)',
    totalEstimate: 'કુલ અંદાજ',
    confirmPurchase: 'ખરીદી કન્ફર્મ કરો',
    confirmSale: 'વેચાણ કન્ફર્મ કરો',
    searchProduct: 'ઉત્પાદન શોધો...',
    stock: 'સ્ટૉક',
    searchByName: 'નામ દ્વારા શોધો...',

    // History
    history: 'ઇતિહાસ',
    filters: 'ફિલ્ટર',
    totalSales: 'કુલ વેચાણ',
    totalBuy: 'કુલ ખરીદી',
    netBalance: 'ચોખ્ખી બૅલૅન્સ',
    exportBtn: 'એક્સપોર્ટ',
    transactionDetails: 'વ્યવહારની વિગત',
    productLabel: 'ઉત્પાદન',
    partyLabel: 'પાર્ટી',
    typeLabel: 'પ્રકાર',
    dateTimeLabel: 'તારીખ અને સમય',
    unitPrice: 'એકમ ભાવ',
    quantityLabel: 'જથ્થો',
    discountLabel: 'ડિસ્કાઉન્ટ',
    totalAmount: 'કુલ રકમ',
    done: 'થઈ ગયું',
    filtersTitle: 'ફિલ્ટર',
    dateRange: 'તારીખ શ્રેણી',
    allTime: 'બધો સમય',
    customDateRange: 'કસ્ટમ તારીખ શ્રેણી',
    fromDate: 'થી',
    toDate: 'સુધી',
    allProducts: 'બધા ઉત્પાદનો',
    allParties: 'બધી પાર્ટીઓ',
    clearAll: 'બધું ક્લીઅર',
    apply: 'લાગુ કરો',
    searchProductFilter: 'ઉત્પાદન શોધો...',
    searchPartyFilter: 'પાર્ટી શોધો...',

    // Management
    management: 'વ્યવસ્થાપન',
    suppliers: 'સપ્લાયર',
    customers: 'ગ્રાહક',
    categories: 'શ્રેણી',
    locations: 'સ્થળ',
    noLocation: 'કોઈ સ્થળ નથી',
    supplier: 'સપ્લાયર',
    customer: 'ગ્રાહક',
    name: 'નામ *',
    location: 'સ્થળ',
    selectLocation: 'સ્થળ પસંદ કરો',
    searchLocations: 'સ્થળ શોધો...',
    noLocationsFound: 'કોઈ સ્થળ મળ્યું નથી',
    saveItem: 'ઉમેરો',
    edit: 'સંપાદિત',
    new: 'નવું',
    updateDetailsFor: 'આની વિગત અપડેટ કરો',
    registerNew: 'નવું નોંધો',
    search: 'શોધ કરો...',

    // Common
    loading: 'લોડ થઈ રહ્યું છે...',
    fetchFailed: 'લોડ નિષ્ફળ',
    couldNotLoad: 'ડૅટા લોડ થઈ શક્યો નથી',
    validationError: 'ચકાસણી ભૂલ',
    saveFailed: 'સાચવી શકાયું નથી',
    success: 'સફળ',
    updated: 'અપડેટ થયું',
  },
};
