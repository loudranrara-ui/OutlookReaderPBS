import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { decryptAccount, encryptAccount, type EncryptedAccountRecord } from "@/lib/crypto"
import { parseCredentialString, type ParsedCredential } from "@/lib/validation"
import { deleteRemoteAccount, isSupabaseConfigured, loadRemoteAccounts, upsertRemoteAccount } from "@/lib/supabase"

const SESSION_PASSPHRASE_KEY = "outlookreader-session-passphrase"

function saveSessionPassphrase(passphrase: string | null) {
    if (typeof window === "undefined") return

    if (passphrase) {
        sessionStorage.setItem(SESSION_PASSPHRASE_KEY, passphrase)
    } else {
        sessionStorage.removeItem(SESSION_PASSPHRASE_KEY)
    }
}

interface VaultState {
    isLocked: boolean
    hasHydrated: boolean
    hasVault: boolean
    isEphemeral: boolean
    accounts: EncryptedAccountRecord[]
    activeAccountId: string | null

    // Decrypted session state (never persisted)
    decryptedAccounts: Record<string, ParsedCredential>
    sessionPassphrase: string | null

    // Actions
    initializeVault: (passphrase: string, ephemeral?: boolean) => Promise<boolean>
    unlockVault: (passphrase: string) => Promise<boolean>
    lockVault: () => void
    addAccount: (credentialString: string, passphrase: string) => Promise<void>
    removeAccount: (accountId: string) => void
    setActiveAccount: (accountId: string) => void
    updateAccountRefreshToken: (accountId: string, newRefreshToken: string) => Promise<void>
    syncRemoteAccounts: (passphrase?: string) => Promise<void>
    getExportString: (accountId?: string) => string
}

export const useVaultStore = create<VaultState>()(
    persist(
        (set, get) => ({
            isLocked: true,
            hasHydrated: false,
            hasVault: false,
            isEphemeral: false,
            accounts: [],
            activeAccountId: null,
            decryptedAccounts: {},
            sessionPassphrase: null,

            initializeVault: async (passphrase: string, ephemeral = false) => {
                if (isSupabaseConfigured) {
                    saveSessionPassphrase(passphrase)
                    set({ isLocked: false, hasVault: false, isEphemeral: false, accounts: [], decryptedAccounts: {}, activeAccountId: null, sessionPassphrase: passphrase })
                    return true
                }

                saveSessionPassphrase(passphrase)
                set({ isLocked: false, hasVault: true, isEphemeral: ephemeral, sessionPassphrase: passphrase })
                return true
            },

            unlockVault: async (passphrase: string) => {
                let { accounts, activeAccountId } = get()

                if (isSupabaseConfigured) {
                    try {
                        const remoteAccounts = await loadRemoteAccounts()
                        accounts = remoteAccounts
                        activeAccountId = activeAccountId && remoteAccounts.some((account) => account.id === activeAccountId)
                            ? activeAccountId
                            : remoteAccounts[0]?.id || null
                        set({ accounts: remoteAccounts, hasVault: remoteAccounts.length > 0, activeAccountId })
                    } catch (error) {
                        console.error("Failed to load remote accounts:", error)
                    }
                }

                if (accounts.length === 0) {
                    if (isSupabaseConfigured) {
                        saveSessionPassphrase(null)
                        set({ isLocked: true, hasVault: false, accounts: [], decryptedAccounts: {}, activeAccountId: null, sessionPassphrase: null })
                        return false
                    }

                    saveSessionPassphrase(passphrase)
                    set({ isLocked: false, sessionPassphrase: passphrase })
                    return true
                }

                try {
                    const decrypted: Record<string, ParsedCredential> = {}
                    for (const acc of accounts) {
                        decrypted[acc.id] = await decryptAccount(acc, passphrase)
                    }
                    const nextActiveAccountId = activeAccountId && decrypted[activeAccountId]
                        ? activeAccountId
                        : accounts[0].id

                    saveSessionPassphrase(passphrase)
                    set({
                        isLocked: false,
                        decryptedAccounts: decrypted,
                        sessionPassphrase: passphrase,
                        activeAccountId: nextActiveAccountId,
                    })
                    return true
                } catch (e) {
                    return false
                }
            },

            lockVault: () => {
                // Secure memory wipe of decrypted accounts and session passphrase
                saveSessionPassphrase(null)
                set({ isLocked: true, decryptedAccounts: {}, sessionPassphrase: null })
            },

            addAccount: async (credentialString: string, passphrase: string) => {
                if (isSupabaseConfigured) throw new Error("Akun hanya bisa ditambahkan melalui halaman admin")
                if (get().isLocked) throw new Error("Vault is locked")

                const parsed = parseCredentialString(credentialString)
                const encrypted = await encryptAccount(parsed, passphrase)

                await upsertRemoteAccount(encrypted)

                set((state) => ({
                    hasVault: true,
                    accounts: [...state.accounts, encrypted],
                    decryptedAccounts: { ...state.decryptedAccounts, [encrypted.id]: parsed },
                    sessionPassphrase: passphrase,
                    activeAccountId: encrypted.id
                }))
            },

            removeAccount: (accountId: string) => {
                if (isSupabaseConfigured) return

                deleteRemoteAccount(accountId).catch((error) => {
                    console.error("Failed to delete remote account:", error)
                })

                set((state) => {
                    const newAccounts = state.accounts.filter(a => a.id !== accountId)
                    const newDecrypted = { ...state.decryptedAccounts }
                    delete newDecrypted[accountId]
                    return {
                        accounts: newAccounts,
                        decryptedAccounts: newDecrypted,
                        activeAccountId: state.activeAccountId === accountId
                            ? (newAccounts.length > 0 ? newAccounts[0].id : null)
                            : state.activeAccountId,
                        hasVault: newAccounts.length > 0
                    }
                })
            },

            setActiveAccount: (accountId: string) => set({ activeAccountId: accountId }),

            updateAccountRefreshToken: async (accountId: string, newRefreshToken: string) => {
                const state = get()
                if (state.isLocked) return

                const currentCred = state.decryptedAccounts[accountId]
                if (!currentCred || currentCred.refreshToken === newRefreshToken) return

                const updatedCred: ParsedCredential = {
                    ...currentCred,
                    refreshToken: newRefreshToken,
                }

                const passphrase = state.sessionPassphrase || ""
                const updatedAccounts = [...state.accounts]

                if (passphrase) {
                    const existingAcc = state.accounts.find((a) => a.id === accountId)
                    if (existingAcc) {
                        const reEncrypted = await encryptAccount(updatedCred, passphrase, accountId)
                        const idx = updatedAccounts.findIndex((a) => a.id === accountId)
                        if (idx !== -1) {
                            updatedAccounts[idx] = reEncrypted
                        }
                        await upsertRemoteAccount(reEncrypted).catch((error) => {
                            console.error("Failed to update remote account:", error)
                        })
                    }
                }

                set((prev) => ({
                    accounts: updatedAccounts,
                    decryptedAccounts: {
                        ...prev.decryptedAccounts,
                        [accountId]: updatedCred,
                    },
                }))
            },

            syncRemoteAccounts: async (passphrase?: string) => {
                if (!isSupabaseConfigured) return

                const state = get()
                const key = passphrase || state.sessionPassphrase
                if (!key) return

                const remoteAccounts = await loadRemoteAccounts()
                if (remoteAccounts.length === 0) return

                const decrypted: Record<string, ParsedCredential> = {}
                for (const account of remoteAccounts) {
                    decrypted[account.id] = await decryptAccount(account, key)
                }

                set((prev) => ({
                    hasVault: true,
                    accounts: remoteAccounts,
                    decryptedAccounts: decrypted,
                    activeAccountId: prev.activeAccountId && decrypted[prev.activeAccountId]
                        ? prev.activeAccountId
                        : remoteAccounts[0]?.id || null,
                }))
            },

            getExportString: (accountId?: string) => {
                const state = get()
                if (state.isLocked) return ""

                const formatAccount = (id: string) => {
                    const cred = state.decryptedAccounts[id]
                    if (!cred) return ""
                    return `${cred.email}:${cred.password}:${cred.refreshToken}:${cred.clientId}`
                }

                if (accountId) {
                    return formatAccount(accountId)
                }

                return state.accounts
                    .map((acc) => formatAccount(acc.id))
                    .filter(Boolean)
                    .join("\n")
            }
        }),
        {
            name: "outlookreader-vault",
            // Only persist encrypted records and flags, NEVER the decrypted session state
            partialize: (state) => ({
                hasVault: isSupabaseConfigured ? false : state.hasVault,
                isEphemeral: isSupabaseConfigured ? false : state.isEphemeral,
                accounts: isSupabaseConfigured ? [] : state.accounts,
                activeAccountId: isSupabaseConfigured ? null : state.activeAccountId
            }),
            storage: createJSONStorage(() => ({
                getItem: (name: string) => {
                    return sessionStorage.getItem(name) || localStorage.getItem(name)
                },
                setItem: (name: string, value: string) => {
                    try {
                        const parsed = JSON.parse(value)
                        if (parsed?.state?.isEphemeral) {
                            sessionStorage.setItem(name, value)
                            // Clean up local storage if it previously existed
                            localStorage.removeItem(name)
                        } else {
                            localStorage.setItem(name, value)
                            sessionStorage.removeItem(name)
                        }
                    } catch {
                        localStorage.setItem(name, value)
                    }
                },
                removeItem: (name: string) => {
                    localStorage.removeItem(name)
                    sessionStorage.removeItem(name)
                }
            })),
            onRehydrateStorage: () => async (state) => {
                if (!state || typeof window === "undefined") return

                if (isSupabaseConfigured) {
                    state.accounts = []
                    state.hasVault = false
                    state.activeAccountId = null
                }

                const passphrase = sessionStorage.getItem(SESSION_PASSPHRASE_KEY)
                if (!passphrase) {
                    state.hasHydrated = true
                    return
                }

                if (state.accounts.length === 0) {
                    state.isLocked = false
                    state.sessionPassphrase = passphrase
                    state.hasHydrated = true
                    return
                }

                try {
                    await state.unlockVault(passphrase)
                    state.hasHydrated = true
                } catch {
                    saveSessionPassphrase(null)
                    state.isLocked = true
                    state.decryptedAccounts = {}
                    state.sessionPassphrase = null
                    state.hasHydrated = true
                }
            }
        }
    )
)
