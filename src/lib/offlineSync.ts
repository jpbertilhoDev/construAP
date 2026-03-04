import localforage from 'localforage'
import { supabase } from './supabase'

// Configure localforage namespace
localforage.config({
    name: 'ConstruAP',
    storeName: 'offline_queue'
})

export type OfflineMutationType =
    | 'SYNC_DIARIO_OBRA'
    | 'SYNC_APONTAMENTO_HORAS'

export interface OfflineAction<T = any> {
    id: string
    type: OfflineMutationType
    timestamp: number
    payload: T
    status: 'pending' | 'failed'
    retryCount: number
    error?: string
}

class OfflineSyncManager {
    private isSyncing = false

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.syncAll())
        }
    }

    /** Add a mutation to the offline queue */
    async addToQueue<T>(type: OfflineMutationType, payload: T): Promise<void> {
        const action: OfflineAction<T> = {
            id: crypto.randomUUID(),
            type,
            timestamp: Date.now(),
            payload,
            status: 'pending',
            retryCount: 0
        }

        const queue: OfflineAction[] = await localforage.getItem('sync_queue') || []
        queue.push(action)
        await localforage.setItem('sync_queue', queue)
        console.log(`[OfflineSync] Added ${type} to queue.`)
    }

    /** Retrieve current queue */
    async getQueue(): Promise<OfflineAction[]> {
        return (await localforage.getItem('sync_queue')) || []
    }

    /** Clear the queue manually */
    async clearQueue(): Promise<void> {
        await localforage.setItem('sync_queue', [])
    }

    /** Process the queue when back online */
    async syncAll(): Promise<void> {
        if (!navigator.onLine) {
            console.log('[OfflineSync] Still offline, ignoring sync.')
            return
        }
        if (this.isSyncing) return

        this.isSyncing = true
        console.log('[OfflineSync] Starting sync...')

        const queue = await this.getQueue()
        if (queue.length === 0) {
            this.isSyncing = false
            return
        }

        const pending = queue.filter(q => q.status === 'pending' || q.status === 'failed')
        const remaining: OfflineAction[] = []

        for (const action of pending) {
            try {
                await this.processAction(action)
            } catch (error: any) {
                console.error(`[OfflineSync] Failed to sync action ${action.id}:`, error)
                action.status = 'failed'
                action.retryCount++
                action.error = error.message
                if (action.retryCount < 5) {
                    remaining.push(action) // Keep it to try later
                }
            }
        }

        // Save back the remaining failed un-retried ones
        await localforage.setItem('sync_queue', remaining)
        this.isSyncing = false
        console.log('[OfflineSync] Sync finished.')
    }

    /** Route the payload to the correct supabase mutation */
    private async processAction(action: OfflineAction): Promise<void> {
        switch (action.type) {
            case 'SYNC_DIARIO_OBRA': {
                const { error } = await supabase.from('diario_obras').insert(action.payload as never)
                if (error) throw new Error(error.message)
                break
            }
            case 'SYNC_APONTAMENTO_HORAS': {
                // (Future sync target if we intercept Timesheets)
                break
            }
            default:
                console.warn(`[OfflineSync] Unknown action type: ${action.type}`)
        }
    }
}

export const offlineSync = new OfflineSyncManager()
