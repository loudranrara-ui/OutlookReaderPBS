import { createClient } from "@supabase/supabase-js"
import { decryptAccount, encryptAccount, type EncryptedAccountRecord } from "./crypto"
import { exchangeRefreshToken, fetchInbox, type InboxMessage } from "./graph"
import { parseCredentialString } from "./validation"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const deviceIdStorageKey = "outlookreader-device-id"
const sharedAccessKeyName = "shared_access_key"

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    })
    : null

export interface SupabaseAccountRow {
    id: string
    owner_id: string
    email: string
    client_id: string
    cipher_text: string
    iv: string
    salt: string
    created_at_ms: number
    updated_at_ms: number
    is_admin_managed?: boolean
}

export interface InboxLogRow {
    id: string
    account_id: string
    owner_id: string
    account_email: string
    message_id: string
    subject: string
    sender: string
    received_at: string | null
    is_read: boolean
    preview: string
    logged_at: string
}

export interface ManagedAccountSummary {
    id: string
    email: string
    client_id: string
    created_at_ms: number
}

async function getOwnerId(): Promise<string | null> {
    if (!supabase) return null

    const { data: existingSession } = await supabase.auth.getSession()
    if (existingSession.session?.user.id) {
        return existingSession.session.user.id
    }

    if (localStorage.getItem(deviceIdStorageKey)) {
        localStorage.removeItem(deviceIdStorageKey)
    }

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    return data.user?.id || null
}

export async function getCurrentOwnerId(): Promise<string | null> {
    return getOwnerId()
}

function toRow(record: EncryptedAccountRecord, ownerId: string): SupabaseAccountRow {
    return {
        id: record.id,
        owner_id: ownerId,
        email: record.email,
        client_id: record.clientId,
        cipher_text: record.cipherText,
        iv: record.iv,
        salt: record.salt,
        created_at_ms: record.createdAt,
        updated_at_ms: record.updatedAt,
    }
}

function toAdminManagedRow(record: EncryptedAccountRecord, ownerId: string): SupabaseAccountRow {
    return {
        ...toRow(record, ownerId),
        is_admin_managed: true,
    }
}

function fromRow(row: SupabaseAccountRow): EncryptedAccountRecord {
    return {
        id: row.id,
        email: row.email,
        clientId: row.client_id,
        cipherText: row.cipher_text,
        iv: row.iv,
        salt: row.salt,
        createdAt: row.created_at_ms,
        updatedAt: row.updated_at_ms,
    }
}

export async function loadRemoteAccounts(): Promise<EncryptedAccountRecord[]> {
    if (!supabase) return []

    const { data, error } = await supabase
        .from("encrypted_accounts")
        .select("*")
        .eq("is_admin_managed", true)
        .order("created_at_ms", { ascending: true })

    if (error) throw error
    return (data as SupabaseAccountRow[]).map(fromRow)
}

export async function loadManagedAccountSummaries(): Promise<ManagedAccountSummary[]> {
    if (!supabase) return []

    const { data, error } = await supabase
        .from("encrypted_accounts")
        .select("id, email, client_id, created_at_ms")
        .eq("is_admin_managed", true)
        .order("created_at_ms", { ascending: true })

    if (error) throw error
    return data as ManagedAccountSummary[]
}

export async function upsertRemoteAccount(record: EncryptedAccountRecord): Promise<void> {
    if (!supabase) return
    const ownerId = await getOwnerId()
    if (!ownerId) return

    const { error } = await supabase
        .from("encrypted_accounts")
        .upsert(toRow(record, ownerId), { onConflict: "id" })

    if (error) throw error
}

export async function deleteRemoteAccount(accountId: string): Promise<void> {
    if (!supabase) return
    const ownerId = await getOwnerId()
    if (!ownerId) return

    const { error } = await supabase
        .from("encrypted_accounts")
        .delete()
        .eq("id", accountId)
        .eq("owner_id", ownerId)

    if (error) throw error
}

export async function logInboxMessages(account: EncryptedAccountRecord, messages: InboxMessage[]): Promise<void> {
    if (!supabase || messages.length === 0) return

    const ownerId = await getOwnerId()
    if (!ownerId) return

    const rows = messages.map((message) => ({
        account_id: account.id,
        owner_id: ownerId,
        account_email: account.email,
        message_id: message.id,
        subject: message.subject,
        sender: message.from,
        received_at: message.receivedDateTime,
        is_read: message.isRead,
        preview: message.bodyPreview,
    }))

    const { error } = await supabase
        .from("inbox_logs")
        .upsert(rows, { onConflict: "account_id,message_id" })

    if (error) throw error
}

export async function adminSignIn(email: string, password: string): Promise<void> {
    if (!supabase) throw new Error("Supabase belum dikonfigurasi")

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
}

export async function adminSignOut(): Promise<void> {
    if (!supabase) return
    await supabase.auth.signOut()
}

export async function getAdminSession() {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session
}

export async function isCurrentUserAdmin(): Promise<boolean> {
    if (!supabase) return false

    const session = await getAdminSession()
    if (!session?.user.email) return false

    const { data, error } = await supabase.rpc("is_admin")

    if (error) throw error
    return data === true
}

export async function loadAdminAccounts(): Promise<SupabaseAccountRow[]> {
    if (!supabase) return []

    const { data, error } = await supabase
        .from("encrypted_accounts")
        .select("id, owner_id, email, client_id, cipher_text, iv, salt, created_at_ms, updated_at_ms, is_admin_managed")
        .order("created_at_ms", { ascending: false })

    if (error) throw error
    return data as SupabaseAccountRow[]
}

export async function loadAdminInboxLogs(accountId?: string): Promise<InboxLogRow[]> {
    if (!supabase) return []

    let query = supabase
        .from("inbox_logs")
        .select("*")
        .order("logged_at", { ascending: false })
        .limit(300)

    if (accountId) {
        query = query.eq("account_id", accountId)
    }

    const { data, error } = await query
    if (error) throw error
    return data as InboxLogRow[]
}

export async function deleteAdminAccount(accountId: string): Promise<void> {
    if (!supabase) return

    const { error } = await supabase
        .from("encrypted_accounts")
        .delete()
        .eq("id", accountId)

    if (error) throw error
}

export async function loadAdminAccessKey(): Promise<string | null> {
    if (!supabase) return null

    const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", sharedAccessKeyName)
        .maybeSingle()

    if (error) throw error
    return data?.value || null
}

export async function updateAdminAccessKey(currentKey: string, nextKey: string): Promise<void> {
    if (!supabase) throw new Error("Supabase belum dikonfigurasi")
    if (nextKey.length < 4) throw new Error("Kunci akses minimal 4 karakter")

    const existingKey = await loadAdminAccessKey()
    const accounts = await loadAdminAccounts()

    if (existingKey && existingKey !== currentKey) {
        throw new Error("Kunci akses saat ini salah")
    }

    const reEncryptedAccounts = await Promise.all(accounts.map(async (account) => {
        if (!existingKey) return account

        const credential = await decryptAccount({
            id: account.id,
            email: account.email,
            clientId: account.client_id,
            cipherText: account.cipher_text,
            iv: account.iv,
            salt: account.salt,
            createdAt: account.created_at_ms,
            updatedAt: account.updated_at_ms,
        }, existingKey)
        const encrypted = await encryptAccount(credential, nextKey, account.id)
        return {
            ...toAdminManagedRow(encrypted, account.owner_id),
            created_at_ms: account.created_at_ms,
        }
    }))

    if (reEncryptedAccounts.length > 0) {
        const { error } = await supabase
            .from("encrypted_accounts")
            .upsert(reEncryptedAccounts, { onConflict: "id" })
        if (error) throw error
    }

    const { error } = await supabase
        .from("admin_settings")
        .upsert({ key: sharedAccessKeyName, value: nextKey, updated_at: new Date().toISOString() })
    if (error) throw error
}

export async function addAdminManagedAccount(credentialString: string): Promise<number> {
    if (!supabase) throw new Error("Supabase belum dikonfigurasi")
    const accessKey = await loadAdminAccessKey()
    if (!accessKey) throw new Error("Atur kunci akses bersama di halaman Pengaturan Admin terlebih dahulu")

    const session = await getAdminSession()
    if (!session?.user.id) throw new Error("Admin belum login")

    const parsed = parseCredentialString(credentialString)
    const encrypted = await encryptAccount(parsed, accessKey)

    const { error } = await supabase
        .from("encrypted_accounts")
        .insert(toAdminManagedRow(encrypted, session.user.id))

    if (error) throw error

    const token = await exchangeRefreshToken(parsed)
    const inbox = await fetchInbox(token.accessToken)
    await logInboxMessages(encrypted, inbox.messages)

    return inbox.messages.length
}
