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
  billCountLabel: string;
  purchases: string;
  sales: string;
  outstandingLabel: string;
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
  productCode: string;
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

  // ── Stock / Bill Entry ───────────────────────────────────
  stockEntry: string;
  purchase: string;
  sell: string;
  purchaseReturn: string;
  sellReturn: string;
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
  confirmReturn: string;
  searchProduct: string;
  stock: string;
  searchByName: string;
  addItem: string;
  removeItem: string;
  addDiscount: string;
  removeDiscount: string;
  originalBill: string;
  selectBill: string;
  searchBills: string;
  note: string;
  billDate: string;
  payNow: string;
  modeOfPayment: string;
  optional: string;
  paymentAmount: string;
  paymentMode: string;
  cash: string;
  online: string;
  netAmount: string;
  afterDiscount: string;
  totalBeforeDiscount: string;
  discountStep: string;
  itemsLabel: string;
  noItemsFound: string;
  createItem: string;
  noPartyFound: string;
  createParty: string;
  viewOriginalBill: string;
  originalQuantity: string;
  alreadyReturned: string;
  maxReturnable: string;
  exceedsReturnableQty: string;
  adjustedBillAmount: string;
  returnsApplied: string;
  linkedReturnBills: string;
  originalBillDetails: string;
  cannotReturnMoreThan: string;
  onlyOriginalItems: string;

  // ── History / Bills ──────────────────────────────────────
  history: string;
  filters: string;
  totalSales: string;
  totalBuy: string;
  netBalance: string;
  exportBtn: string;
  transactionDetails: string;
  billDetails: string;
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
  lineItems: string;
  paymentsLabel: string;
  recordPayment: string;
  outstanding: string;
  totalPaid: string;
  paid: string;
  noBills: string;
  billCount: string;
  totalOutstanding: string;
  allTypes: string;
  billType: string;

  // ── Management ───────────────────────────────────────────
  management: string;
  parties: string;
  party: string;
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
  enterProductCode: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Tab bar
    tabDashboard: 'Dashboard',
    tabProducts: 'Products',
    tabManagement: 'Management',
    tabStock: 'Bill',
    tabHistory: 'History',

    // Dashboard
    overview: 'Overview',
    totalStock: 'Total Stock',
    totalHistory: 'Total History',
    billCountLabel: 'Bills',
    purchases: 'Purchases',
    sales: 'Sales',
    outstandingLabel: 'Outstanding',
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
    productCode: 'Product Code',
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

    // Stock / Bill Entry
    stockEntry: 'Bill',
    purchase: 'Purchase',
    sell: 'Sell',
    purchaseReturn: 'Purchase Return',
    sellReturn: 'Sell Return',
    product: 'Product *',
    partySupplierCustomer: 'Party *',
    selectProduct: 'Select Product',
    selectParty: 'Select Party',
    quantity: 'Qty *',
    price: 'Price *',
    discountPercent: 'Discount (%)',
    totalEstimate: 'Total Estimate',
    confirmPurchase: 'Confirm Purchase',
    confirmSale: 'Confirm Sale',
    confirmReturn: 'Confirm Return',
    searchProduct: 'Search product...',
    stock: 'Stock',
    searchByName: 'Search by name...',
    addItem: '+ Add Item',
    removeItem: 'Remove',
    addDiscount: '+ Add Discount',
    removeDiscount: 'Remove',
    originalBill: 'Original Bill *',
    selectBill: 'Select Original Bill',
    searchBills: 'Search bills...',
    note: 'Note (optional)',
    billDate: 'Bill Date',
    payNow: 'Mode of Payment (optional)',
    modeOfPayment: 'Mode of Payment',
    optional: 'Optional',
    paymentAmount: 'Amount Paid',
    paymentMode: 'Payment Mode',
    cash: 'Cash',
    online: 'Online',
    netAmount: 'Net Amount',
    afterDiscount: 'After discount',
    totalBeforeDiscount: 'Subtotal',
    discountStep: 'Discount',
    itemsLabel: 'Items',
    noItemsFound: 'No items found',
    createItem: 'Create & Select',
    noPartyFound: 'No party found',
    createParty: 'Create & Select Party',
    viewOriginalBill: 'View Original Bill',
    originalQuantity: 'Original Qty',
    alreadyReturned: 'Already Returned',
    maxReturnable: 'Max Returnable',
    exceedsReturnableQty: 'Quantity exceeds available return count',
    adjustedBillAmount: 'Adjusted Amount',
    returnsApplied: 'Returns Applied',
    linkedReturnBills: 'Return References',
    originalBillDetails: 'Original Bill Details',
    cannotReturnMoreThan: 'Cannot return more than',
    onlyOriginalItems: 'Only items from the original bill can be returned',

    // History / Bills
    history: 'Bills',
    filters: 'Filters',
    totalSales: 'Total Sales',
    totalBuy: 'Total Purchases',
    netBalance: 'Net Balance',
    exportBtn: 'Export',
    transactionDetails: 'Transaction Details',
    billDetails: 'Bill Details',
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
    lineItems: 'Items',
    paymentsLabel: 'Payments',
    recordPayment: 'Record Payment',
    outstanding: 'Outstanding',
    totalPaid: 'Total Paid',
    paid: 'Paid',
    noBills: 'No bills found',
    billCount: 'Bills',
    totalOutstanding: 'Outstanding',
    allTypes: 'All Types',
    billType: 'Bill Type',

    // Management
    management: 'Management',
    parties: 'Parties',
    party: 'Party',
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
    enterProductCode: 'Please enter product code',
  },

  gu: {
    // Tab bar
    tabDashboard: 'ડૅશબોર્ડ',
    tabProducts: 'પ્રોડક્ટ્સ',
    tabManagement: 'મેનેજમેન્ટ',
    tabStock: 'બિલ',
    tabHistory: 'હિસ્ટ્રી',

    // Dashboard
    overview: 'સારાંશ',
    totalStock: 'કુલ સ્ટૉક',
    totalHistory: 'કુલ હિસ્ટ્રી',
    billCountLabel: 'બિલ',
    purchases: 'ખરીદી',
    sales: 'વેચાણ',
    outstandingLabel: 'બાકી રકમ',
    last7DaysTrend: 'છેલ્લા ૭ દિવસનો ટ્રૅન્ડ',
    stockByCategory: 'શ્રેણી મુજબ સ્ટૉક',
    updatingStatistics: 'આંકડા અપડેટ થઈ રહ્યા છે...',
    noCategoryData: 'કોઈ શ્રેણી ડૅટા ઉપલબ્ધ નથી',

    // Products
    inventory: 'ઇન્વેન્ટરી',
    searchProducts: 'પ્રોડક્ટ્ શોધો...',
    category: 'શ્રેણી',
    allCategories: 'બધી શ્રેણીઓ',
    filterCategory: 'શ્રેણી ફિલ્ટર',
    editProduct: 'પ્રોડક્ટ સંપાદિત કરો',
    newProduct: 'નવું પ્રોડક્ટ્',
    updateProductInfo: 'પ્રોડક્ટની માહિતી અપડેટ કરો',
    enterDetailsNewStock: 'નવા સ્ટૉક માટે વિગત દાખલ કરો',
    productName: 'પ્રોડક્ટ્નું નામ *',
    productCode: 'પ્રોડક્ટ્ કોડ',
    unit: 'એકમ',
    initialStock: 'પ્રારંભિક સ્ટૉક *',
    basePrice: 'બેઝ પ્રાઇસ *',
    selectCategory: 'શ્રેણી પસંદ કરો',
    saveChanges: 'ફેરફાર સાચવો',
    addProduct: 'પ્રોડક્ટ્ ઉમેરો',
    discard: 'રદ કરો',
    selectCategoryTitle: 'શ્રેણી પસંદ કરો',
    searchOrAddNew: 'શોધો અથવા નવું ઉમેરો...',
    addAsNewCategory: '"{query}" ને નવી શ્રેણી તરીકે ઉમેરો',
    uncategorized: 'વર્ગીકૃત નથી',
    units: 'એકમ',

    // Stock / Bill Entry
    stockEntry: 'બિલ',
    purchase: 'ખરીદી',
    sell: 'વેચાણ',
    purchaseReturn: 'ખરીદી વળતર',
    sellReturn: 'વેચાણ વળતર',
    product: 'પ્રોડક્ટ્ *',
    partySupplierCustomer: 'પાર્ટી *',
    selectProduct: 'પ્રોડક્ટ્ પસંદ કરો',
    selectParty: 'પાર્ટી પસંદ કરો',
    quantity: 'જથ્થો *',
    price: 'ભાવ *',
    discountPercent: 'ડિસ્કાઉન્ટ (%)',
    totalEstimate: 'કુલ અંદાજ',
    confirmPurchase: 'ખરીદી કન્ફર્મ કરો',
    confirmSale: 'વેચાણ કન્ફર્મ કરો',
    confirmReturn: 'વળતર કન્ફર્મ કરો',
    searchProduct: 'પ્રોડક્ટ્ શોધો...',
    stock: 'સ્ટૉક',
    searchByName: 'નામ દ્વારા શોધો...',
    addItem: '+ આઇટમ ઉમેરો',
    removeItem: 'દૂર કરો',
    addDiscount: '+ ડિસ્કાઉન્ટ ઉમેરો',
    removeDiscount: 'દૂર કરો',
    originalBill: 'મૂળ બિલ *',
    selectBill: 'મૂળ બિલ પસંદ કરો',
    searchBills: 'બિલ શોધો...',
    note: 'નોંધ (વૈકલ્પિક)',
    billDate: 'બિલ તારીખ',
    payNow: 'ચૂકવણી પ્રકાર (વૈકલ્પિક)',
    modeOfPayment: 'ચૂકવણી પ્રકાર',
    optional: 'વૈકલ્પિક',
    paymentAmount: 'ચૂકવેલ રકમ',
    paymentMode: 'ચૂકવણી પ્રકાર',
    cash: 'રોકડ',
    online: 'ઑનલાઇન',
    netAmount: 'ચોખ્ખી રકમ',
    afterDiscount: 'ડિસ્કાઉન્ટ પછી',
    totalBeforeDiscount: 'પેટા-કુલ',
    discountStep: 'ડિસ્કાઉન્ટ',
    itemsLabel: 'આઇટમ',
    noItemsFound: 'કોઈ આઇટમ મળી નથી',
    createItem: 'બનાવો અને પસંદ કરો',
    noPartyFound: 'કોઈ પાર્ટી મળી નથી',
    createParty: 'પાર્ટી બનાવો અને પસંદ કરો',
    viewOriginalBill: 'મૂળ બિલ જુઓ',
    originalQuantity: 'મૂળ જથ્થો',
    alreadyReturned: 'અગાઉ પરત કરેલ',
    maxReturnable: 'મહત્તમ પરત એકમો',
    exceedsReturnableQty: 'જથ્થો પરત કરવા યોગ્ય સંખ્યા કરતાં વધુ છે',
    adjustedBillAmount: 'સુધારેલ રકમ',
    returnsApplied: 'પરત કરેલ રકમ',
    linkedReturnBills: 'પરત બિલ સંદર્ભ',
    originalBillDetails: 'મૂળ બિલની વિગતો',
    cannotReturnMoreThan: 'આનાથી વધુ પરત કરી શકાતું નથી:',
    onlyOriginalItems: 'માત્ર મૂળ બિલની આઇટમ્સ જ પરત કરી શકાય છે',

    // History / Bills
    history: 'બિલ',
    filters: 'ફિલ્ટર',
    totalSales: 'કુલ વેચાણ',
    totalBuy: 'કુલ ખરીદી',
    netBalance: 'ચોખ્ખી બૅલૅન્સ',
    exportBtn: 'એક્સપોર્ટ',
    transactionDetails: 'વ્યવહારની વિગત',
    billDetails: 'બિલ વિગત',
    productLabel: 'પ્રોડક્ટ્',
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
    allProducts: 'બધા પ્રોડક્ટ્સ',
    allParties: 'બધી પાર્ટીઓ',
    clearAll: 'બધું ક્લીઅર',
    apply: 'લાગુ કરો',
    searchProductFilter: 'પ્રોડક્ટ્ શોધો...',
    searchPartyFilter: 'પાર્ટી શોધો...',
    lineItems: 'આઇટમ',
    paymentsLabel: 'ચૂકવણી',
    recordPayment: 'ચૂકવણી નોંધો',
    outstanding: 'બાકી',
    totalPaid: 'કુલ ચૂકવ્યું',
    paid: 'ચૂકવ્યું',
    noBills: 'કોઈ બિલ મળ્યું નથી',
    billCount: 'બિલ',
    totalOutstanding: 'બાકી રકમ',
    allTypes: 'બધા પ્રકાર',
    billType: 'બિલ પ્રકાર',

    // Management
    management: 'મેનેજમેન્ટ',
    parties: 'પાર્ટીઓ',
    party: 'પાર્ટી',
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
    edit: 'એડિટ',
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
    enterProductCode: 'કૃપા કરીને પ્રોડક્ટ્ કોડ દાખલ કરો',
  },
};
