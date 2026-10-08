/**
 * Client-Side IndexedDB Offline Storage Engine
 */

const DB_NAME = 'resto_offline_db'
const DB_VERSION = 1

export interface OfflineOrder {
  id: string
  locationId: string
  tableId: string
  items: Array<{
    menuItemId: string
    name: string
    price: number
    quantity: number
    modifiers?: unknown[]
    specialNote?: string
  }>
  guestCount: number
  notes?: string
  createdAt: string
  synced: boolean
}

export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported in this environment'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event: unknown) => {
      const db = event.target.result

      // Store for offline pending orders
      if (!db.objectStoreNames.contains('offline_orders')) {
        const orderStore = db.createObjectStore('offline_orders', { keyPath: 'id' })
        orderStore.createIndex('synced', 'synced', { unique: false })
      }

      // Store for menu cache
      if (!db.objectStoreNames.contains('menu_cache')) {
        db.createObjectStore('menu_cache', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveOfflineOrder(order: OfflineOrder): Promise<void> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_orders', 'readwrite')
    const store = tx.objectStore('offline_orders')
    const request = store.put(order)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getUnsyncedOrders(): Promise<OfflineOrder[]> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_orders', 'readonly')
    const store = tx.objectStore('offline_orders')
    const index = store.index('synced')
    const request = index.getAll(IDBKeyRange.only(false))
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function getOfflineOrder(orderId: string): Promise<OfflineOrder | null> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_orders', 'readonly')
    const store = tx.objectStore('offline_orders')
    const request = store.get(orderId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function updateOfflineOrder(
  orderId: string,
  updater: (order: OfflineOrder) => OfflineOrder
): Promise<OfflineOrder> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_orders', 'readwrite')
    const store = tx.objectStore('offline_orders')
    const request = store.get(orderId)
    request.onsuccess = () => {
      if (!request.result) {
        return reject(new Error('Offline order not found'))
      }
      const updated = updater(request.result)
      store.put(updated)
      resolve(updated)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function cacheMenu(categories: unknown[], items: unknown[]): Promise<void> {
  try {
    const db = await openOfflineDB()
    const tx = db.transaction('menu_cache', 'readwrite')
    const store = tx.objectStore('menu_cache')
    store.put({ id: 'catalog', categories, items, cachedAt: new Date().toISOString() })
  } catch (err) {
    console.warn('[OfflineDB] Failed to cache menu:', err)
  }
}

export async function getCachedMenu(): Promise<{ categories: unknown[]; items: unknown[] } | null> {
  try {
    const db = await openOfflineDB()
    return new Promise((resolve) => {
      const tx = db.transaction('menu_cache', 'readonly')
      const store = tx.objectStore('menu_cache')
      const req = store.get('catalog')
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function markOrdersSynced(orderIds: string[]): Promise<void> {
  const db = await openOfflineDB()
  const tx = db.transaction('offline_orders', 'readwrite')
  const store = tx.objectStore('offline_orders')

  for (const id of orderIds) {
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      if (getReq.result) {
        const item = getReq.result
        item.synced = true
        store.put(item)
      }
    }
  }
}

