export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface TranslationSchema {
  // Common
  common: {
    appName: string;
    search: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    close: string;
    confirm: string;
    loading: string;
    noData: string;
    error: string;
    success: string;
    back: string;
    next: string;
    previous: string;
    yes: string;
    no: string;
    all: string;
    refresh: string;
    retry: string;
    currency: string;
    actions: string;
    optional: string;
    required: string;
    filter: string;
    export: string;
    print: string;
    total: string;
    subtotal: string;
    discount: string;
    notes: string;
    date: string;
    time: string;
    status: string;
    name: string;
    price: string;
    quantity: string;
    category: string;
    description: string;
    active: string;
    inactive: string;
    available: string;
    unavailable: string;
    details: string;
    summary: string;
    settings: string;
    notifications: string;
    welcome: string;
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    thisYear: string;
    custom: string;
    from: string;
    to: string;
    saving: string;
    saved: string;
    user: string;
  };

  // Auth & Login
  auth: {
    login: string;
    logout: string;
    username: string;
    password: string;
    loginTitle: string;
    loginSubtitle: string;
    loginButton: string;
    loggingIn: string;
    loginError: string;
    invalidCredentials: string;
    sessionExpired: string;
    adminLogin: string;
    employeeLogin: string;
    rememberMe: string;
  };

  // Sidebar & Navigation
  nav: {
    mainMenu: string;
    dashboard: string;
    staffMenu: string;
    cashier: string;
    orders: string;
    tables: string;
    rooms: string;
    roomOrders: string;
    products: string;
    menu: string;
    inventory: string;
    workers: string;
    permissions: string;
    reports: string;
    posSystem: string;
  };

  // Roles
  roles: {
    admin: string;
    cashier: string;
    staff: string;
    systemAdmin: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    totalRevenue: string;
    todayOrders: string;
    activeProducts: string;
    paidOrders: string;
    recentOrders: string;
    order: string;
    product: string;
    noOrders: string;
    noOrdersToday: string;
    viewAll: string;
  };

  // Order statuses
  orderStatus: {
    pending: string;
    processing: string;
    preparing: string;
    ready: string;
    paid: string;
    completed: string;
    cancelled: string;
  };

  // Payment
  payment: {
    cash: string;
    card: string;
    paymentMethod: string;
    receivedAmount: string;
    change: string;
    pay: string;
    payAndClose: string;
    paid: string;
    unpaid: string;
  };

  // Cashier
  cashier: {
    title: string;
    subtitle: string;
    addToCart: string;
    cart: string;
    emptyCart: string;
    clearCart: string;
    checkout: string;
    orderType: string;
    table: string;
    room: string;
    takeaway: string;
    selectTable: string;
    selectRoom: string;
    newOrder: string;
    orderNumber: string;
    itemsCount: string;
    discountPercent: string;
    applyDiscount: string;
    printReceipt: string;
    dailyClosing: string;
    addOrderToRoom: string;
    addOrderToTable: string;
    addItems: string;
    loadingCashier: string;
    pendingOrders: string;
    noPendingOrders: string;
    clearCartConfirm: string;
    clearCartMessage: string;
    yesClear: string;
    closingToday: string;
    products: string;
    payment: string;
    pending: string;
    closing: string;
    payOrder: string;
    fromStaffMenu: string;
    fromCashier: string;
    items: string;
    fullAmount: string;
    paying: string;
    errorLoadingData: string;
    addedToCart: string;
    cartCleared: string;
    mustLogin: string;
    paymentSuccess: string;
    paymentError: string;
    orderError: string;
    orderAlreadyPaid: string;
    cannotAddToPaid: string;
    noActiveOrderForTable: string;
    startNewRoomOrder: string;
    dailyClosingSuccess: string;
    previousPrice: string;
    minAmount: string;
  };

  // Products
  products: {
    title: string;
    subtitle: string;
    addProduct: string;
    editProduct: string;
    deleteProduct: string;
    productName: string;
    productNameEn: string;
    productPrice: string;
    productCategory: string;
    productImage: string;
    productEmoji: string;
    productActive: string;
    noProducts: string;
    confirmDelete: string;
    categories: string;
    addCategory: string;
    editCategory: string;
    categoryName: string;
    categoryNameEn: string;
  };

  // Tables
  tables: {
    title: string;
    subtitle: string;
    addTable: string;
    editTable: string;
    tableNumber: string;
    area: string;
    tableName: string;
    statusAvailable: string;
    statusOccupied: string;
    statusReserved: string;
    statusClosed: string;
    noTables: string;
    confirmDelete: string;
  };

  // Rooms
  rooms: {
    title: string;
    subtitle: string;
    addRoom: string;
    editRoom: string;
    roomNumber: string;
    roomName: string;
    roomPrice: string;
    hourlyRate: string;
    malePrice: string;
    femalePrice: string;
    priceType: string;
    fixed: string;
    perPerson: string;
    statusAvailable: string;
    statusOccupied: string;
    statusMaintenance: string;
    noRooms: string;
    noRoomsMatch: string;
    gender: string;
    male: string;
    female: string;
    totalRooms: string;
    deleteRoom: string;
    confirmDeleteRoom: string;
    yesDelete: string;
    cannotDeleteActive: string;
    cannotDeactivateActive: string;
    activate: string;
    deactivate: string;
    searchPlaceholder: string;
    order: string;
    number: string;
    capacity: string;
    currentOrder: string;
    duration: string;
    irreversible: string;
  };

  // Orders
  orders: {
    title: string;
    subtitle: string;
    orderDetails: string;
    orderDate: string;
    orderTotal: string;
    orderStatus: string;
    orderItems: string;
    noOrders: string;
    filterByStatus: string;
    filterByPayment: string;
    filterByType: string;
    allStatuses: string;
    allTypes: string;
    markCompleted: string;
    markPaid: string;
    cancelOrder: string;
    deleteOrder: string;
    confirmCancel: string;
    confirmDeleteOrder: string;
  };

  // Inventory
  inventory: {
    title: string;
    subtitle: string;
    addStock: string;
    removeStock: string;
    adjustStock: string;
    currentStock: string;
    stockHistory: string;
    lowStock: string;
    outOfStock: string;
    unit: string;
    minQuantity: string;
    stockQty: string;
    noItems: string;
  };

  // Workers
  workers: {
    title: string;
    subtitle: string;
    addWorker: string;
    editWorker: string;
    workerName: string;
    workerRole: string;
    workerPhone: string;
    workerEmail: string;
    workerPassword: string;
    resetPassword: string;
    noWorkers: string;
    confirmDelete: string;
    permissions: string;
    assignPermissions: string;
  };

  // Reports
  reports: {
    title: string;
    subtitle: string;
    salesReport: string;
    dailyReport: string;
    weeklyReport: string;
    monthlyReport: string;
    yearlyReport: string;
    totalSales: string;
    totalOrders: string;
    averageOrder: string;
    cashSales: string;
    cardSales: string;
    topProducts: string;
    salesTrend: string;
    periodComparison: string;
    exportReport: string;
    dailyClosing: string;
    openingCash: string;
    closingCash: string;
    expenses: string;
    actualCash: string;
    difference: string;
    closingDate: string;
    closedBy: string;
    alreadyClosed: string;
    confirmAndClose: string;
    reviewAndConfirm: string;
    salesData: string;
    ordersCount: string;
    paidOrdersCount: string;
    unpaidOrdersCount: string;
    tableOrders: string;
    roomOrders: string;
    takeawayOrders: string;
    cashReconciliation: string;
    expectedCash: string;
    actualVsExpected: string;
    errorLoading: string;
    closingSavedSuccess: string;
    exportSuccess: string;
    exportError: string;
    exporting: string;
    exportPDF: string;
    closingLog: string;
  };

  // Menu (Staff view)
  menuView: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    allCategories: string;
    outOfStock: string;
    addToOrder: string;
    loadingMenu: string;
    selectAndOrder: string;
    orderSentSuccess: string;
    orderSubmitError: string;
    productCount: string;
    noProductsMessage: string;
  };

  // Permissions
  permissionsPage: {
    title: string;
    subtitle: string;
    selectWorker: string;
    savePermissions: string;
    modules: string;
    allModules: string;
    workers: string;
    createOrder: string;
    editOrder: string;
    cancelOrder: string;
    processPayment: string;
    applyDiscount: string;
    viewFinancials: string;
    manageProducts: string;
    manageTables: string;
    manageRooms: string;
    dailyClosingAction: string;
    modulesAccess: string;
    allowedActions: string;
    enableAll: string;
    disableAll: string;
    financialDataHidden: string;
    financialDataWarning: string;
    permissionsOf: string;
    errorSaving: string;
    worker: string;
  };

  // Error Boundary
  errorBoundary: {
    title: string;
    message: string;
    retry: string;
    refreshPage: string;
  };

  // Language
  language: {
    switchLanguage: string;
    arabic: string;
    english: string;
  };
}
