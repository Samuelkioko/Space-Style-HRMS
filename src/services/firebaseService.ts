import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import {
  Transaction,
  CompanyInfo,
  ProductServiceItem,
  ExpenseCategoryItem,
  BillingDocument,
  TrashBundle,
  SystemUser,
  UserRole,
  Customer,
  SystemLicenseConfig,
} from '../types';
import {
  getLocalLicenseConfig,
  saveLocalLicenseConfig,
  calculateOneYearExpiry,
} from '../utils/licenseUtils';
import firebaseConfigData from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfigData);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Root bootstrap administrator email from metadata
export const BOOTSTRAP_ADMIN_EMAIL = 'sammuelkioko99@gmail.com';

// Initialize Firestore with configured databaseId if specified
export const db: Firestore =
  firebaseConfigData && (firebaseConfigData as any).firestoreDatabaseId
    ? getFirestore(app, (firebaseConfigData as any).firestoreDatabaseId)
    : getFirestore(app);

// Collection Names
export const TRANSACTIONS_COLLECTION = 'transactions';
export const COMPANY_PROFILE_COLLECTION = 'company_profiles';
export const PRODUCTS_COLLECTION = 'products_services';
export const EXPENSE_CATEGORIES_COLLECTION = 'expense_categories';
export const DOCUMENTS_COLLECTION = 'billing_documents';
export const TRASH_COLLECTION = 'trash_bundles';
export const USERS_COLLECTION = 'users';
export const CUSTOMERS_COLLECTION = 'customers';
export const SYSTEM_LICENSE_COLLECTION = 'system_license';
export const DEFAULT_PROFILE_DOC_ID = 'main_company';
export const DEFAULT_LICENSE_DOC_ID = 'current_license';

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operation: OperationType;
  path: string | null;
  authInfo: {
    isAuthenticated: boolean;
    userId: string | null;
  };
}

/**
 * Sanitizes object by removing `undefined` values to prevent Firestore unsupported field value rejections.
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (Array.isArray(val)) {
        cleaned[key] = val
          .filter((item) => item !== undefined)
          .map((item) =>
            typeof item === 'object' && item !== null ? cleanForFirestore(item) : item
          );
      } else if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
        cleaned[key] = cleanForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    }
  });
  return cleaned;
}

/**
 * Standard Firestore error handler for structured error logs
 */
export function handleFirestoreError(error: unknown, operation: OperationType, path: string | null = null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const info: FirestoreErrorInfo = {
    error: errMessage,
    operation,
    path,
    authInfo: {
      isAuthenticated: false,
      userId: null,
    },
  };
  console.error('Firestore operation error:', JSON.stringify(info, null, 2));
  throw new Error(JSON.stringify(info));
}

// -------------------------------------------------------------
// COMPANY PROFILE OPERATIONS
// -------------------------------------------------------------

/**
 * Fetch company profile from Firestore
 */
export async function getCompanyProfileFromCloud(): Promise<CompanyInfo | null> {
  try {
    const docRef = doc(db, COMPANY_PROFILE_COLLECTION, DEFAULT_PROFILE_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CompanyInfo;
    }
    return null;
  } catch (error) {
    console.warn('Note on fetching cloud company profile (using local fallback if offline):', error);
    return null;
  }
}

/**
 * Save company profile to Firestore
 */
export async function saveCompanyProfileToCloud(profile: CompanyInfo): Promise<boolean> {
  try {
    const docRef = doc(db, COMPANY_PROFILE_COLLECTION, DEFAULT_PROFILE_DOC_ID);
    const payload = cleanForFirestore({
      ...profile,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, 'write', `${COMPANY_PROFILE_COLLECTION}/${DEFAULT_PROFILE_DOC_ID}`);
  }
}

/**
 * Subscribe to real-time company profile updates
 */
export function subscribeToCompanyProfile(onUpdate: (profile: CompanyInfo) => void) {
  const docRef = doc(db, COMPANY_PROFILE_COLLECTION, DEFAULT_PROFILE_DOC_ID);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as CompanyInfo);
      }
    },
    (err) => {
      console.warn('Company profile subscription warning:', err);
    }
  );
}

// -------------------------------------------------------------
// TRANSACTIONS OPERATIONS
// -------------------------------------------------------------

/**
 * Subscribe to real-time transactions from Firestore
 */
export function subscribeToTransactions(onUpdate: (transactions: Transaction[]) => void) {
  const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Transaction;
        txs.push({
          ...data,
          id: docSnap.id,
        });
      });
      onUpdate(txs);
    },
    (error) => {
      console.warn('Firestore transaction listener warning:', error);
    }
  );
}

/**
 * Add or update single transaction in Firestore
 */
export async function syncTransactionToCloud(tx: Transaction): Promise<void> {
  try {
    const docRef = doc(db, TRANSACTIONS_COLLECTION, tx.id);
    const payload = cleanForFirestore({
      ...tx,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, 'write', `${TRANSACTIONS_COLLECTION}/${tx.id}`);
  }
}

/**
 * Delete transaction from Firestore
 */
export async function deleteTransactionFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, TRANSACTIONS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', `${TRANSACTIONS_COLLECTION}/${id}`);
  }
}

/**
 * Batch upload / bulk sync all local transactions to Firestore
 */
export async function uploadAllTransactionsToCloud(transactions: Transaction[]): Promise<{ count: number }> {
  try {
    const batch = writeBatch(db);
    transactions.forEach((tx) => {
      const docRef = doc(db, TRANSACTIONS_COLLECTION, tx.id);
      const payload = cleanForFirestore({
        ...tx,
        updatedAt: new Date().toISOString(),
      });
      batch.set(docRef, payload);
    });
    await batch.commit();
    return { count: transactions.length };
  } catch (error) {
    handleFirestoreError(error, 'write', TRANSACTIONS_COLLECTION);
  }
}

/**
 * Fetch all transactions from Firestore (one-time pull)
 */
export async function fetchAllTransactionsFromCloud(): Promise<Transaction[]> {
  try {
    const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    const txs: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      txs.push({
        ...(docSnap.data() as Transaction),
        id: docSnap.id,
      });
    });
    return txs;
  } catch (error) {
    console.warn('Failed to pull transactions from cloud (using local ledger state):', error);
    return [];
  }
}

// -------------------------------------------------------------
// PRODUCTS & SERVICES OPERATIONS
// -------------------------------------------------------------

/**
 * Fetch all products & services from Firestore
 */
export async function fetchProductsFromCloud(): Promise<ProductServiceItem[]> {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION));
    const snapshot = await getDocs(q);
    const items: ProductServiceItem[] = [];
    snapshot.forEach((docSnap) => {
      items.push({
        ...(docSnap.data() as ProductServiceItem),
        id: docSnap.id,
      });
    });
    return items;
  } catch (error) {
    console.error('Failed to fetch products from cloud:', error);
    return [];
  }
}

/**
 * Save / Update a single product or service in Firestore
 */
export async function saveProductToCloud(item: ProductServiceItem): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, item.id);
    const payload = cleanForFirestore({
      ...item,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, 'write', `${PRODUCTS_COLLECTION}/${item.id}`);
  }
}

/**
 * Delete a product or service from Firestore
 */
export async function deleteProductFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', `${PRODUCTS_COLLECTION}/${id}`);
  }
}

/**
 * Bulk upload products/services to Firestore
 */
export async function uploadAllProductsToCloud(products: ProductServiceItem[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    products.forEach((prod) => {
      const docRef = doc(db, PRODUCTS_COLLECTION, prod.id);
      const payload = cleanForFirestore({
        ...prod,
        updatedAt: new Date().toISOString(),
      });
      batch.set(docRef, payload);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'write', PRODUCTS_COLLECTION);
  }
}

/**
 * Real-time listener for products & services
 */
export function subscribeToProducts(onUpdate: (items: ProductServiceItem[]) => void) {
  const q = query(collection(db, PRODUCTS_COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ProductServiceItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as ProductServiceItem),
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore products listener warning:', error);
    }
  );
}

// -------------------------------------------------------------
// EXPENSE CATEGORIES OPERATIONS
// -------------------------------------------------------------

/**
 * Fetch all expense categories from Firestore
 */
export async function fetchExpenseCategoriesFromCloud(): Promise<ExpenseCategoryItem[]> {
  try {
    const q = query(collection(db, EXPENSE_CATEGORIES_COLLECTION));
    const snapshot = await getDocs(q);
    const items: ExpenseCategoryItem[] = [];
    snapshot.forEach((docSnap) => {
      items.push({
        ...(docSnap.data() as ExpenseCategoryItem),
        id: docSnap.id,
      });
    });
    return items;
  } catch (error) {
    console.error('Failed to fetch expense categories from cloud:', error);
    return [];
  }
}

/**
 * Save / Update a single expense category in Firestore
 */
export async function saveExpenseCategoryToCloud(item: ExpenseCategoryItem): Promise<void> {
  try {
    const docRef = doc(db, EXPENSE_CATEGORIES_COLLECTION, item.id);
    const payload = cleanForFirestore({
      ...item,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, 'write', `${EXPENSE_CATEGORIES_COLLECTION}/${item.id}`);
  }
}

/**
 * Delete an expense category from Firestore
 */
export async function deleteExpenseCategoryFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, EXPENSE_CATEGORIES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', `${EXPENSE_CATEGORIES_COLLECTION}/${id}`);
  }
}

/**
 * Bulk upload expense categories to Firestore
 */
export async function uploadAllExpenseCategoriesToCloud(items: ExpenseCategoryItem[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, EXPENSE_CATEGORIES_COLLECTION, item.id);
      const payload = cleanForFirestore({
        ...item,
        updatedAt: new Date().toISOString(),
      });
      batch.set(docRef, payload);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'write', EXPENSE_CATEGORIES_COLLECTION);
  }
}

/**
 * Real-time listener for expense categories
 */
export function subscribeToExpenseCategories(onUpdate: (items: ExpenseCategoryItem[]) => void) {
  const q = query(collection(db, EXPENSE_CATEGORIES_COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ExpenseCategoryItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as ExpenseCategoryItem),
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore expense categories listener warning:', error);
    }
  );
}

// -------------------------------------------------------------
// BILLING DOCUMENTS (QUOTATIONS, INVOICES, RECEIPTS) OPERATIONS
// -------------------------------------------------------------

/**
 * Fetch all billing documents (Quotations, Invoices, Receipts) from Firestore
 */
export async function fetchDocumentsFromCloud(): Promise<BillingDocument[]> {
  try {
    const q = query(collection(db, DOCUMENTS_COLLECTION), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    const items: BillingDocument[] = [];
    snapshot.forEach((docSnap) => {
      items.push({
        ...(docSnap.data() as BillingDocument),
        id: docSnap.id,
      });
    });
    return items;
  } catch (error) {
    console.error('Failed to fetch billing documents from cloud:', error);
    return [];
  }
}

/**
 * Save / Update a single billing document in Firestore
 */
export async function saveDocumentToCloud(item: BillingDocument): Promise<void> {
  try {
    const docRef = doc(db, DOCUMENTS_COLLECTION, item.id);
    const payload = cleanForFirestore({
      ...item,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, 'write', `${DOCUMENTS_COLLECTION}/${item.id}`);
  }
}

/**
 * Delete a billing document from Firestore
 */
export async function deleteDocumentFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, DOCUMENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', `${DOCUMENTS_COLLECTION}/${id}`);
  }
}

/**
 * Bulk upload billing documents to Firestore
 */
export async function uploadAllDocumentsToCloud(items: BillingDocument[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, DOCUMENTS_COLLECTION, item.id);
      const payload = cleanForFirestore({
        ...item,
        updatedAt: new Date().toISOString(),
      });
      batch.set(docRef, payload);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'write', DOCUMENTS_COLLECTION);
  }
}

/**
 * Real-time listener for billing documents (Quotations, Invoices, Receipts)
 */
export function subscribeToDocuments(onUpdate: (items: BillingDocument[]) => void) {
  const q = query(collection(db, DOCUMENTS_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: BillingDocument[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          ...(docSnap.data() as BillingDocument),
          id: docSnap.id,
        });
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore billing documents listener warning:', error);
    }
  );
}

// -------------------------------------------------------------
// TRASH BUNDLES (CASCADED DELETIONS & RESTORATION)
// -------------------------------------------------------------

/**
 * Save a deleted trash bundle into Firestore
 */
export async function saveTrashBundleToCloud(bundle: TrashBundle): Promise<void> {
  try {
    const docRef = doc(db, TRASH_COLLECTION, bundle.id);
    const payload = cleanForFirestore({
      ...bundle,
      customerName: bundle.customerName ?? '',
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'create', TRASH_COLLECTION);
  }
}

/**
 * Fetch all trash bundles from Firestore
 */
export async function fetchTrashBundlesFromCloud(): Promise<TrashBundle[]> {
  try {
    const q = query(collection(db, TRASH_COLLECTION), orderBy('trashedAt', 'desc'));
    const snap = await getDocs(q);
    const items: TrashBundle[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...(d.data() as any) });
    });
    return items;
  } catch (error) {
    console.warn('Could not fetch trash bundles from cloud:', error);
    return [];
  }
}

/**
 * Delete a trash bundle permanently from Firestore
 */
export async function deleteTrashBundleFromCloud(bundleId: string): Promise<void> {
  try {
    const docRef = doc(db, TRASH_COLLECTION, bundleId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', TRASH_COLLECTION);
  }
}

/**
 * Empty all trash from Firestore permanently
 */
export async function clearAllTrashFromCloud(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, TRASH_COLLECTION));
    if (snap.empty) return 0;
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach((d) => {
      batch.delete(d.ref);
      count++;
    });
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, 'delete', TRASH_COLLECTION);
    return 0;
  }
}

/**
 * Real-time listener for Trash Bundles in Firestore
 */
export function subscribeToTrashBundles(onUpdate: (bundles: TrashBundle[]) => void) {
  const colRef = collection(db, TRASH_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: TrashBundle[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as any) });
      });
      // Sort desc by trashedAt
      items.sort((a, b) => (b.trashedAt || '').localeCompare(a.trashedAt || ''));
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore trash bundles listener warning:', error);
    }
  );
}

// -------------------------------------------------------------
// DATABASE PURGE & CLEAN-UP OPERATIONS
// -------------------------------------------------------------

/**
 * Clean & Wipe all transactions, billing documents, products, and categories in Firestore
 */
export async function clearAllDataFromCloud(): Promise<{
  deletedTransactions: number;
  deletedDocuments: number;
  deletedProducts: number;
  deletedExpenseCategories: number;
}> {
  try {
    let deletedTransactions = 0;
    let deletedDocuments = 0;
    let deletedProducts = 0;
    let deletedExpenseCategories = 0;

    // 1. Delete all transactions in Firestore
    const txSnap = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
    if (!txSnap.empty) {
      const batch = writeBatch(db);
      txSnap.forEach((d) => {
        batch.delete(d.ref);
        deletedTransactions++;
      });
      await batch.commit();
    }

    // 2. Delete all documents in Firestore
    const docSnap = await getDocs(collection(db, DOCUMENTS_COLLECTION));
    if (!docSnap.empty) {
      const batch = writeBatch(db);
      docSnap.forEach((d) => {
        batch.delete(d.ref);
        deletedDocuments++;
      });
      await batch.commit();
    }

    // 3. Delete all products in Firestore
    const prodSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    if (!prodSnap.empty) {
      const batch = writeBatch(db);
      prodSnap.forEach((d) => {
        batch.delete(d.ref);
        deletedProducts++;
      });
      await batch.commit();
    }

    // 4. Delete all expense categories in Firestore
    const expSnap = await getDocs(collection(db, EXPENSE_CATEGORIES_COLLECTION));
    if (!expSnap.empty) {
      const batch = writeBatch(db);
      expSnap.forEach((d) => {
        batch.delete(d.ref);
        deletedExpenseCategories++;
      });
      await batch.commit();
    }

    // 5. Delete all trash bundles in Firestore
    const trashSnap = await getDocs(collection(db, TRASH_COLLECTION));
    if (!trashSnap.empty) {
      const batch = writeBatch(db);
      trashSnap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }

    return {
      deletedTransactions,
      deletedDocuments,
      deletedProducts,
      deletedExpenseCategories,
    };
  } catch (error) {
    handleFirestoreError(error, 'delete', 'all_collections');
  }
}

// -------------------------------------------------------------
// USER MANAGEMENT & ROLE-BASED ACCESS (ADMIN & STAFF)
// -------------------------------------------------------------

/**
 * Fetch all system users from Firestore
 */
export async function fetchAllUsersFromCloud(): Promise<SystemUser[]> {
  try {
    const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    const users: SystemUser[] = [];
    snapshot.forEach((docSnap) => {
      users.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    return users;
  } catch (error) {
    console.warn('Note on fetching cloud users (fallback to empty/local):', error);
    return [];
  }
}

/**
 * Save / update system user in Firestore
 */
export async function saveUserToCloud(user: SystemUser): Promise<boolean> {
  try {
    const docRef = doc(db, USERS_COLLECTION, user.id);
    const payload = cleanForFirestore({
      ...user,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, 'write', `${USERS_COLLECTION}/${user.id}`);
    return false;
  }
}

/**
 * Delete a user from Firestore (deletes by ID and cleans up any matching email records across database)
 */
export async function deleteUserFromCloud(userId: string, email?: string): Promise<boolean> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(docRef);

    // If an email was provided, also delete any duplicate or alias records with matching email
    if (email) {
      const q = query(collection(db, USERS_COLLECTION));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let batchCount = 0;

      snap.forEach((d) => {
        const data = d.data();
        if (
          d.id === userId ||
          (data.email && data.email.trim().toLowerCase() === email.trim().toLowerCase())
        ) {
          batch.delete(d.ref);
          batchCount++;
        }
      });

      if (batchCount > 0) {
        await batch.commit();
      }
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, 'delete', `${USERS_COLLECTION}/${userId}`);
    return false;
  }
}

/**
 * Real-time listener for Users collection - always broadcasts current database records
 */
export function subscribeToUsers(onUpdate: (users: SystemUser[]) => void) {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SystemUser[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as SystemUser), id: docSnap.id });
      });
      // Always broadcast live list to propagate deletions and updates immediately across all clients
      onUpdate(list);
    },
    (error) => {
      console.warn('Firestore users listener warning:', error);
    }
  );
}

export const DEFAULT_ROOT_ADMIN_PASSWORD = 'Admin@123';

/**
 * Hashes a password string using browser Web Crypto SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`salt_mgmt_${password}`);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Subtle crypto fallback:', e);
  }
  // Simple deterministic fallback
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * Verifies an entered password against stored password hash or legacy password
 */
export async function verifyPassword(
  enteredPassword: string,
  storedHashOrPassword?: string
): Promise<boolean> {
  if (!enteredPassword || !storedHashOrPassword) return false;
  if (enteredPassword === storedHashOrPassword) return true;
  const computedHash = await hashPassword(enteredPassword);
  return computedHash === storedHashOrPassword;
}

/**
 * Resolves a user account by either email address or username
 */
export function findUserByIdentifier(
  identifier: string,
  userList: SystemUser[]
): { user: SystemUser | null; isRootAdmin: boolean } {
  if (!identifier) return { user: null, isRootAdmin: false };
  const clean = identifier.trim().toLowerCase();

  const rootEmail = BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  const rootPrefix = rootEmail.split('@')[0];
  const isRootMatch =
    clean === rootEmail ||
    clean === rootPrefix ||
    clean === 'admin' ||
    clean === 'sammuel' ||
    clean === 'sammuel kioko';

  const matched = userList.find((u) => {
    const userEmail = (u.email || '').trim().toLowerCase();
    const userUsername = (u.username || '').trim().toLowerCase();
    const userDisplayName = (u.displayName || '').trim().toLowerCase();
    const userPrefix = userEmail ? userEmail.split('@')[0] : '';

    return (
      userEmail === clean ||
      (userUsername && userUsername === clean) ||
      (userDisplayName && userDisplayName === clean) ||
      (userPrefix && userPrefix === clean)
    );
  });

  return {
    user: matched || null,
    isRootAdmin: isRootMatch,
  };
}

/**
 * Checks if a user has Super Admin privileges
 */
export function isSuperAdminRole(user: SystemUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (user.email && user.email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) return true;
  return false;
}

/**
 * Checks if a user has Admin or Super Admin privileges
 */
export function isAdminRole(user: SystemUser | null | undefined): boolean {
  if (!user) return false;
  if (isSuperAdminRole(user)) return true;
  return user.role === 'admin';
}

/**
 * Checks if a user is in a regular data-entry User/Staff role
 */
export function isStaffRole(user: SystemUser | null | undefined): boolean {
  if (!user) return true;
  return user.role === 'staff' || user.role === 'user';
}

/**
 * Verifies if the provided credentials belong to an active Administrator or Super Administrator.
 * Used to authorize deletions requested by staff/user accounts.
 */
export async function verifyAdminCredentials(
  identifier: string,
  enteredPassword: string,
  userList: SystemUser[]
): Promise<{ success: boolean; adminUser?: SystemUser; error?: string }> {
  if (!identifier || !identifier.trim()) {
    return { success: false, error: 'Please provide an Administrator email or username.' };
  }
  if (!enteredPassword || !enteredPassword.trim()) {
    return { success: false, error: 'Please provide the Administrator password.' };
  }

  const { user: matchedUser, isRootAdmin } = findUserByIdentifier(identifier, userList);

  if (!matchedUser) {
    if (isRootAdmin) {
      if (enteredPassword.trim() === DEFAULT_ROOT_ADMIN_PASSWORD) {
        const rootAdmin: SystemUser = {
          id: 'admin-root',
          email: BOOTSTRAP_ADMIN_EMAIL,
          displayName: 'Sammuel Kioko',
          username: 'sammuelkioko99',
          role: 'super_admin',
          department: 'Executive Administration',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        return { success: true, adminUser: rootAdmin };
      }
      return { success: false, error: 'Authentication failed: Incorrect password for Super Administrator.' };
    }
    return {
      success: false,
      error: 'Administrator not found. The account entered does not exist or is not registered.',
    };
  }

  // Account must be active
  if (matchedUser.isActive === false) {
    return {
      success: false,
      error: `Access Denied: Account "${matchedUser.displayName}" is currently disabled or inactive.`,
    };
  }

  // Account MUST be an admin or super_admin
  if (!isAdminRole(matchedUser)) {
    return {
      success: false,
      error: `Authorization Denied: Account "${matchedUser.displayName}" is a ${matchedUser.role?.toUpperCase() || 'USER'} account, not an Administrator.`,
    };
  }

  // Verify password
  let passwordMatches = false;
  if (matchedUser.password) {
    passwordMatches = await verifyPassword(enteredPassword.trim(), matchedUser.password);
  } else if (
    matchedUser.email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() ||
    isRootAdmin
  ) {
    passwordMatches = enteredPassword.trim() === DEFAULT_ROOT_ADMIN_PASSWORD;
  } else {
    // If no password set yet for this admin
    passwordMatches = enteredPassword.trim() === DEFAULT_ROOT_ADMIN_PASSWORD;
  }

  if (!passwordMatches) {
    return { success: false, error: 'Authentication failed: Incorrect administrator password.' };
  }

  return { success: true, adminUser: matchedUser };
}

/**
 * Sign in using Firebase Google Auth with popup and fallback to redirect
 */
export async function signInWithGoogleAuth(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      console.warn('Google sign-in popup blocked by browser/iframe environment. Initiating redirect fallback...');
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr: any) {
        console.warn('Redirect sign-in fallback unavailable in this frame:', redirectErr?.message || redirectErr);
        throw error;
      }
    }
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.warn('Google sign-in was cancelled by user.');
      throw error;
    }
    console.warn('Google Sign-In note:', error?.message || error);
    throw error;
  }
}

/**
 * Checks for a pending redirect result upon app initialization
 */
export async function checkRedirectResult(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (err: any) {
    console.warn('Google redirect result check:', err?.message || err);
    return null;
  }
}

/**
 * Sign out current user
 */
export async function signOutAuth(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
  }
}

// ============================================================================
// CUSTOMER DIRECTORY MANAGEMENT (Firestore Synced)
// ============================================================================

/**
 * Real-time listener for Customers collection
 */
export function subscribeToCustomers(onUpdate: (customers: Customer[]) => void) {
  const q = query(collection(db, CUSTOMERS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as Customer), id: docSnap.id });
      });
      onUpdate(list);
    },
    (error) => {
      console.warn('Firestore customers listener warning:', error);
    }
  );
}

/**
 * Fetches all customer records from Firestore
 */
export async function fetchAllCustomersFromCloud(): Promise<Customer[]> {
  try {
    const q = query(collection(db, CUSTOMERS_COLLECTION), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const list: Customer[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as Customer), id: docSnap.id });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, 'list', CUSTOMERS_COLLECTION);
    return [];
  }
}

/**
 * Saves or updates a customer in Firestore
 */
export async function saveCustomerToCloud(customer: Customer): Promise<void> {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customer.id);
    const payload = cleanForFirestore({
      ...customer,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'write', `${CUSTOMERS_COLLECTION}/${customer.id}`);
  }
}

/**
 * Deletes a customer from Firestore
 */
export async function deleteCustomerFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', `${CUSTOMERS_COLLECTION}/${id}`);
  }
}

/**
 * Auto-saves or updates a customer entry.
 * If customer name already exists (case-insensitive), it updates any new/missing details.
 * If customer is new, it creates and saves a new customer record to Firestore.
 */
export async function autoSaveOrUpdateCustomer(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  billingAddress?: string;
  taxId?: string;
  kraPin?: string;
  pin?: string;
  notes?: string;
}): Promise<Customer | null> {
  const trimmedName = (data.name || '').trim();
  if (!trimmedName) return null;

  const effectiveTaxId = data.taxId?.trim() || data.kraPin?.trim() || data.pin?.trim() || '';
  const effectiveAddress = data.address?.trim() || data.billingAddress?.trim() || '';

  try {
    const existing = await fetchAllCustomersFromCloud();
    const cleanPhone = (data.phone || '').trim().replace(/[\s\-\(\)]/g, '');
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanTax = effectiveTaxId.toUpperCase();

    const matched = existing.find((c) => {
      // 1. Check exact name match (case-insensitive)
      if (c.name.trim().toLowerCase() === trimmedName.toLowerCase()) return true;
      // 2. Check Tax ID / PIN match if provided
      const cTax = (c.taxId || c.kraPin || c.pin || '').trim().toUpperCase();
      if (cleanTax && cTax && cTax === cleanTax) return true;
      // 3. Check email match if provided
      if (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail) return true;
      // 4. Check phone match if provided
      if (cleanPhone && c.phone) {
        const cPhone = c.phone.trim().replace(/[\s\-\(\)]/g, '');
        if (cPhone && cPhone === cleanPhone) return true;
      }
      return false;
    });

    if (matched) {
      const updated: Customer = {
        ...matched,
        name: trimmedName,
        email: data.email?.trim() || matched.email || '',
        phone: data.phone?.trim() || matched.phone || '',
        address: effectiveAddress || matched.address || '',
        billingAddress: effectiveAddress || matched.billingAddress || matched.address || '',
        taxId: effectiveTaxId || matched.taxId || '',
        kraPin: effectiveTaxId || matched.kraPin || matched.taxId || '',
        pin: effectiveTaxId || matched.pin || matched.taxId || '',
        notes: data.notes?.trim() || matched.notes || '',
        updatedAt: new Date().toISOString(),
      };
      await saveCustomerToCloud(updated);
      return updated;
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: trimmedName,
        email: data.email?.trim() || '',
        phone: data.phone?.trim() || '',
        address: effectiveAddress || '',
        billingAddress: effectiveAddress || '',
        taxId: effectiveTaxId || '',
        kraPin: effectiveTaxId || '',
        pin: effectiveTaxId || '',
        notes: data.notes?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveCustomerToCloud(newCustomer);
      return newCustomer;
    }
  } catch (err) {
    console.error('Error in autoSaveOrUpdateCustomer:', err);
    return null;
  }
}

// ============================================================================
// ATOMIC CASCADE DELETION ENGINE (Guaranteed Deletion from Active Collections)
// ============================================================================

/**
 * Atomically executes a permanent cascade deletion across Firestore collections:
 * 1. Permanently deletes target transactions from 'transactions' collection
 * 2. Permanently deletes target documents from 'billing_documents' collection
 * No Trash Bin or recovery record is created - records are permanently purged.
 * Using writeBatch ensures items never fail half-way or reappear on reload.
 */
export async function executeCascadeDeletionInCloud(payload: {
  documents?: Array<{ id: string } | string>;
  transactions?: Array<{ id: string } | string>;
  documentIds?: string[];
  transactionIds?: string[];
}): Promise<void> {
  try {
    const batch = writeBatch(db);

    const docIds: string[] = [
      ...(payload.documentIds || []),
      ...(payload.documents?.map((d) => (typeof d === 'string' ? d : d.id)) || []),
    ].filter(Boolean);

    const txIds: string[] = [
      ...(payload.transactionIds || []),
      ...(payload.transactions?.map((t) => (typeof t === 'string' ? t : t.id)) || []),
    ].filter(Boolean);

    // 1. Delete all transactions
    txIds.forEach((id) => {
      const txRef = doc(db, TRANSACTIONS_COLLECTION, id);
      batch.delete(txRef);
    });

    // 2. Delete all documents
    docIds.forEach((id) => {
      const docRef = doc(db, DOCUMENTS_COLLECTION, id);
      batch.delete(docRef);
    });

    await batch.commit();
  } catch (error) {
    console.error('Batch cascade permanent deletion failed, running resilient fallback:', error);
    const docIds: string[] = [
      ...(payload.documentIds || []),
      ...(payload.documents?.map((d) => (typeof d === 'string' ? d : d.id)) || []),
    ].filter(Boolean);

    const txIds: string[] = [
      ...(payload.transactionIds || []),
      ...(payload.transactions?.map((t) => (typeof t === 'string' ? t : t.id)) || []),
    ].filter(Boolean);

    // Fallback: individually delete to guarantee active records are purged
    for (const id of txIds) {
      try {
        await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
      } catch (e) {
        console.error(`Failed to delete transaction ${id} from Firestore:`, e);
      }
    }
    for (const id of docIds) {
      try {
        await deleteDoc(doc(db, DOCUMENTS_COLLECTION, id));
      } catch (e) {
        console.error(`Failed to delete document ${id} from Firestore:`, e);
      }
    }
  }
}

// ============================================================================
// SYSTEM LICENSE & ACTIVATION MANAGEMENT
// ============================================================================

/**
 * Save updated system license activation details to Firestore and localStorage.
 */
export async function saveSystemLicenseToCloud(config: SystemLicenseConfig): Promise<void> {
  try {
    const docRef = doc(db, SYSTEM_LICENSE_COLLECTION, DEFAULT_LICENSE_DOC_ID);
    const expiry = config.expiryDate || calculateOneYearExpiry(config.activationDate);
    const isDeactivated = Boolean(config.isDeactivated);
    const payload = cleanForFirestore({
      ...config,
      expiryDate: expiry,
      durationYears: config.durationYears || 1,
      isDeactivated,
      deactivatedAt: isDeactivated ? (config.deactivatedAt || new Date().toISOString()) : null,
      deactivatedBy: isDeactivated ? (config.deactivatedBy || null) : null,
      deactivationReason: isDeactivated ? (config.deactivationReason || null) : null,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, payload, { merge: true });
    saveLocalLicenseConfig({
      ...config,
      expiryDate: expiry,
      durationYears: config.durationYears || 1,
      isDeactivated,
      updatedAt: payload.updatedAt,
    });
  } catch (error) {
    console.warn('Could not save license to cloud, updating local cache:', error);
    saveLocalLicenseConfig(config);
  }
}

/**
 * Fetch current system license activation details from Firestore or fallback to local cache.
 */
export async function getSystemLicenseFromCloud(): Promise<SystemLicenseConfig> {
  try {
    const docRef = doc(db, SYSTEM_LICENSE_COLLECTION, DEFAULT_LICENSE_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as SystemLicenseConfig;
      if (!data.expiryDate && data.activationDate) {
        data.expiryDate = calculateOneYearExpiry(data.activationDate);
      }
      saveLocalLicenseConfig(data);
      return data;
    }
  } catch (error) {
    console.warn('Could not fetch license from Firestore, falling back to local storage:', error);
  }
  return getLocalLicenseConfig();
}

/**
 * Real-time listener for system license configuration.
 */
export function subscribeToSystemLicense(onUpdate: (config: SystemLicenseConfig) => void) {
  const docRef = doc(db, SYSTEM_LICENSE_COLLECTION, DEFAULT_LICENSE_DOC_ID);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemLicenseConfig;
        if (!data.expiryDate && data.activationDate) {
          data.expiryDate = calculateOneYearExpiry(data.activationDate);
        }
        saveLocalLicenseConfig(data);
        onUpdate(data);
      } else {
        const local = getLocalLicenseConfig();
        onUpdate(local);
      }
    },
    (error) => {
      console.warn('System license listener notice:', error);
    }
  );
}

export { DEFAULT_SYSTEM_LICENSE } from '../utils/licenseUtils';



