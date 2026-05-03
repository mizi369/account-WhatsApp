
import { 
  Booking, Employee, Payroll, InventoryItem, SaleRecord, Expense, 
  Customer, Promotion, Invoice, Quotation,
  AiQuestion, AiAnswer, AiMapping, AiTraining, AiLock, AiLearningLog, ServicePrice, BlockedSlot
} from '../types';
import { db as firestore, handleFirestoreError, OperationType, waitForAuth, auth } from '../service/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  setDoc,
  onSnapshot 
} from 'firebase/firestore';

export const TABLES = {
  BOOKINGS: 'mnf_bookings',
  EMPLOYEES: 'mnf_employees',
  PAYROLL: 'mnf_payroll',
  INVENTORY: 'mnf_inventory',
  SALES: 'mnf_sales',
  EXPENSES: 'mnf_expenses',
  CUSTOMERS: 'mnf_customers',
  PROMOTIONS: 'mnf_promotions',
  AI_QUESTIONS: 'mnf_ai_questions',
  AI_ANSWERS: 'mnf_ai_answers',
  AI_MAPPINGS: 'mnf_ai_mappings',
  AI_TRAINING: 'mnf_ai_training',
  AI_LOCKS: 'mnf_ai_locks',
  AI_LEARNING_LOGS: 'mnf_ai_learning_logs',
  SERVICES: 'mnf_services',
  BLOCKED_SLOTS: 'mnf_blocked_slots',
  TIME_SLOTS: 'mnf_time_slots',
  TEAMS: 'mnf_teams',
  CHAT_LOGS: 'mnf_chat_logs',
  SETTINGS: 'mnf_settings',
  TEMPLATES: 'mnf_templates',
  DOCUMENTS: 'mnf_documents',
  TRANSACTIONS: 'mnf_transactions'
};

const listeners: { [key: string]: () => void } = {};

export const db = {
  // Initialize: Fetch all data from Firestore and cache in LocalStorage for sync reads
  init: async () => {
    console.log('[DB] Waiting for Auth before Sync...');
    await waitForAuth();
    
    if (!auth.currentUser) {
        console.log('[DB] Not authenticated. Skipping Firestore Sync.');
        return false;
    }

    console.log('[DB] Starting Firestore Sync for:', auth.currentUser.email);
    try {
        const tableKeys = Object.values(TABLES);
        
        await Promise.all(tableKeys.map(async (tableName) => {
            try {
                // Initial sync
                const querySnapshot = await getDocs(collection(firestore, tableName));
                const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                localStorage.setItem(tableName, JSON.stringify(data));

                // Set up real-time listener if not already active
                if (listeners[tableName]) listeners[tableName](); 
                listeners[tableName] = onSnapshot(collection(firestore, tableName), (snapshot) => {
                    const updatedData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
                    localStorage.setItem(tableName, JSON.stringify(updatedData));
                }, (error) => {
                    console.warn(`[DB] Real-time listener error for ${tableName}:`, error);
                });

            } catch (error) {
                console.warn(`[DB] Initial sync failed for ${tableName}:`, error);
                if (!localStorage.getItem(tableName)) localStorage.setItem(tableName, '[]');
            }
        }));
        
        console.log('[DB] Sync Complete.');
        return true;
    } catch (e) {
        console.error('[DB] Critical Sync Error:', e);
        return false;
    }
  },

  // Synchronous Read (from Cache) - Fast for UI rendering
  getAll: <T>(table: string): T[] => {
    try {
      const data = localStorage.getItem(table);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`[DB] Error reading table ${table}`, e);
      return [];
    }
  },

  getById: <T extends { id: string | number }>(table: string, id: string | number): T | undefined => {
    const items = db.getAll<T>(table);
    return items.find(i => String(i.id) === String(id));
  },

  // Async Write (Firestore + Cache Update)
  insert: async <T>(table: string, item: T) => {
    const newItem = { ...item } as any;
    const tempId = newItem.id;
    delete newItem.id; // Let Firestore generate ID or handle accordingly

    try {
        let docRef;
        if (tempId && isNaN(Number(tempId))) {
             // If it's a specific string ID (like settings key), use setDoc
             await setDoc(doc(firestore, table, String(tempId)), newItem);
             docRef = { id: String(tempId) };
        } else {
             docRef = await addDoc(collection(firestore, table), newItem);
        }
        
        console.log(`[DB] Inserted into ${table} with ID: ${docRef.id}`);
        return { error: null, id: docRef.id };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, table);
        return { error };
    }
  },

  // Sync Customer from Booking/Sale
  syncCustomer: async (data: { name: string; phone: string; address?: string }) => {
    if (!data.phone) return;
    
    try {
      const customers = db.getAll<Customer>(TABLES.CUSTOMERS);
      const existingCustomer = customers.find(c => c.phone === data.phone);
      
      if (existingCustomer) {
        if (existingCustomer.name !== data.name || (data.address && existingCustomer.address !== data.address)) {
          await db.update<any>(TABLES.CUSTOMERS, existingCustomer.id, {
            name: data.name,
            address: data.address || existingCustomer.address,
            lastService: new Date().toISOString().split('T')[0]
          });
        }
      } else {
        await db.insert<any>(TABLES.CUSTOMERS, {
          name: data.name,
          phone: data.phone,
          address: data.address || '',
          totalSpent: 0,
          lastService: new Date().toISOString().split('T')[0]
        });
      }
    } catch (e) {
      console.error('[DB] Customer Sync Error:', e);
    }
  },

  update: async <T extends { id: string | number }>(table: string, id: string | number, updates: Partial<T>) => {
    const cleanUpdates = { ...updates } as any;
    delete cleanUpdates.id;

    try {
        const docRef = doc(firestore, table, String(id));
        await updateDoc(docRef, cleanUpdates);
        console.log(`[DB] Updated ${table} : ${id}`);
        return { error: null };
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${table}/${id}`);
        return { error };
    }
  },

  delete: async <T extends { id: string | number }>(table: string, id: string | number) => {
    try {
        const docRef = doc(firestore, table, String(id));
        await deleteDoc(docRef);
        console.log(`[DB] Deleted from ${table} : ${id}`);
        return { error: null };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${table}/${id}`);
        return { error };
    }
  },

  getStats: () => {
    const documents = db.getAll<any>(TABLES.DOCUMENTS);
    const invoices = documents.filter(d => d.type === 'invoice');
    const sales = db.getAll<any>(TABLES.SALES);
    const quotations = documents.filter(d => d.type === 'quotation');
    const bookings = db.getAll<Booking>(TABLES.BOOKINGS);
    const knowledgeCount = db.getAll(TABLES.AI_MAPPINGS).length;
    const customersCount = db.getAll(TABLES.CUSTOMERS).length;
    const employeesCount = db.getAll(TABLES.EMPLOYEES).length;
    const payroll = db.getAll<any>(TABLES.PAYROLL);
    const expenses = db.getAll<any>(TABLES.EXPENSES);
    const teams = db.getAll<any>(TABLES.TEAMS);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonthName = monthNames[currentMonth];

    // Invoices Stats
    const totalInvoices = invoices.length;
    const totalQuotations = quotations.length;
    
    const paidInvoicesAmount = invoices
      .filter(d => d.status === 'Paid')
      .reduce((sum, d) => sum + (d.total || 0), 0);
    
    const paidSalesAmount = sales
      .filter(s => s.status === 'Paid')
      .reduce((sum, s) => sum + (s.amount || s.total || 0), 0);

    const paidAmount = paidInvoicesAmount + paidSalesAmount;

    const pendingInvoicesAmount = invoices
      .filter(d => d.status !== 'Paid')
      .reduce((sum, d) => sum + (d.total || 0), 0);
    
    const pendingSalesAmount = sales
      .filter(s => s.status !== 'Paid')
      .reduce((sum, s) => sum + (s.amount || s.total || 0), 0);

    const pendingAmount = pendingInvoicesAmount + pendingSalesAmount;

    // Payroll Stats (Current Month)
    const monthlyPayroll = payroll.filter(p => p.month === currentMonthName && p.year.toString() === currentYear.toString());
    const grossSalary = monthlyPayroll.reduce((sum, p) => sum + (p.basic_salary || p.basic || 0), 0);
    const totalEpf = monthlyPayroll.reduce((sum, p) => sum + (p.epf_employee || p.epfEmp || p.epf || 0), 0);
    const totalSocso = monthlyPayroll.reduce((sum, p) => sum + (p.socso_employee || p.socsoEmp || p.socso || 0), 0);
    const netPayable = monthlyPayroll.reduce((sum, p) => sum + (p.net || p.net_salary || 0), 0);
    const monthlyPayrollCost = netPayable; 

    // Teams
    const activeTeams = teams.filter((t: any) => t.active || t.status === 'active').length;

    // Expenses (Current Month)
    const monthlyExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalBelanjaBulanIni = monthlyExpenses.reduce((sum, e) => sum + (e.cost || e.amount || 0), 0);
    
    // Fuel Stats (Current Month)
    const fuelExpenses = monthlyExpenses.filter(e => e.type === 'fuel');
    const kekerapanIsiMinyak = fuelExpenses.length;
    const totalFuelCost = fuelExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const purataSekaliIsi = kekerapanIsiMinyak > 0 ? totalFuelCost / kekerapanIsiMinyak : 0;

    // Today's stats
    const today = now.toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.date === today).length;
    
    // Inventory Stats
    const inventory = db.getAll<any>(TABLES.INVENTORY);
    const inventoryCount = inventory.length;
    const lowStockCount = inventory.filter(i => i.stock <= 5).length;
    const totalInventoryValue = inventory.reduce((sum, i) => sum + (i.buyPrice * i.stock), 0);

    // Monthly Sales (from paid invoices and sales this month)
    const monthlyInvoiceSales = invoices
      .filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && s.status === 'Paid';
      })
      .reduce((sum, s) => sum + (s.total || 0), 0);

    const monthlyDirectSales = sales
      .filter(s => {
        const d = new Date(s.created_at || s.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && s.status === 'Paid';
      })
      .reduce((sum, s) => sum + (s.amount || s.total || 0), 0);

    const monthlySales = monthlyInvoiceSales + monthlyDirectSales;

    return {
      monthlySales,
      todayBookings,
      knowledgeCount,
      customersCount,
      employeesCount,
      totalInvoices,
      totalQuotations,
      paidAmount,
      pendingAmount,
      monthlyPayrollCost,
      activeTeams,
      grossSalary,
      totalEpf,
      totalSocso,
      netPayable,
      totalBelanjaBulanIni,
      kekerapanIsiMinyak,
      purataSekaliIsi,
      inventoryCount,
      lowStockCount,
      totalInventoryValue
    };
  },

  getTableStats: () => {
    return Object.entries(TABLES).map(([key, tableName]) => {
      const data = db.getAll(tableName);
      return {
        name: tableName,
        records: data.length,
        size: (JSON.stringify(data).length / 1024).toFixed(2) + ' KB',
        status: 'Healthy',
        lastSync: 'Masa Nyata'
      };
    });
  },

  saveSetting: async (key: string, value: any) => {
    const settings = db.getAll<any>(TABLES.SETTINGS);
    const index = settings.findIndex(s => s.key === key);
    if (index !== -1) {
      settings[index].value = value;
      await db.update<any>(TABLES.SETTINGS, settings[index].id, { value });
    } else {
      await db.insert<any>(TABLES.SETTINGS, { key, value });
    }
  },

  getSetting: (key: string, defaultValue: any = null) => {
    const settings = db.getAll<any>(TABLES.SETTINGS);
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  }
};
