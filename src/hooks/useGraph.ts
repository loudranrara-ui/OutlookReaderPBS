import { useState, useCallback } from "react"
import { useVaultStore } from "@/store/vaultStore"
import {
    fetchInbox,
    fetchMessageDetail,
    getFriendlyEmailError,
    exchangeRefreshToken,
    type InboxResponse,
    type MessageDetail,
} from "@/lib/graph"
import { logInboxMessages } from "@/lib/supabase"
import { toast } from "sonner"
const refreshPromises = new Map<string, Promise<string | null>>()

interface SessionToken {
    accountId: string
    accessToken: string
}

export function useGraph() {
    const { activeAccountId, accounts, decryptedAccounts } = useVaultStore()
    const [activeAccessToken, setActiveAccessToken] = useState<SessionToken | null>(null)

    // Retrieves the valid access token, refreshing if necessary
    const getValidToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
        if (!activeAccountId) return null
        const account = decryptedAccounts[activeAccountId]
        if (!account) return null

        // If we already have a session token, return it (optimistic path)
        if (!forceRefresh && activeAccessToken?.accountId === activeAccountId) {
            return activeAccessToken.accessToken
        }

        const pendingRefresh = refreshPromises.get(activeAccountId)
        if (pendingRefresh) {
            const token = await pendingRefresh
            if (token) setActiveAccessToken({ accountId: activeAccountId, accessToken: token })
            return token
        }

        let exchangeError: string | null = null

        const refreshPromise = exchangeRefreshToken(account).then(resp => {
            if (resp.refreshToken && resp.refreshToken !== account.refreshToken) {
                // Update active vault account with newly issued refresh token
                useVaultStore.getState().updateAccountRefreshToken(activeAccountId, resp.refreshToken)
            }
            return resp.accessToken
        }).catch(err => {
            exchangeError = err.message || "Token exchange failed"
            console.error("Token exchange failed:", err)
            return null
        })

        refreshPromises.set(activeAccountId, refreshPromise)
        const token = await refreshPromise
        refreshPromises.delete(activeAccountId)

        if (token) {
            setActiveAccessToken({ accountId: activeAccountId, accessToken: token })
        } else {
            toast.error("Akun tidak dapat dibuka", {
                description: getFriendlyEmailError(exchangeError),
            })
        }
        return token
    }, [activeAccountId, decryptedAccounts, activeAccessToken])

    // Wrapper for any graph fetch that handles 401 token expiration
    const graphCallWithRetry = useCallback(
        async <T>(fetcherFn: (token: string) => Promise<T>): Promise<T | null> => {
            let token = await getValidToken()
            if (!token) return null

            try {
                return await fetcherFn(token)
            } catch (err: any) {
                if (err.message === "UNAUTHORIZED_ACCESS_TOKEN") {
                    // Token expired mid-session.
                    // Pass `true` to forceRefresh because the closure `activeAccessToken` is still populated.
                    setActiveAccessToken(null)
                    token = await getValidToken(true)
                    if (!token) return null

                    return await fetcherFn(token)
                }

                if (err.message && err.message.startsWith("GRAPH_RATE_LIMIT")) {
                    const retrySecs = err.message.split(":")[1]
                    toast.error("Permintaan dibatasi Microsoft", {
                        description: `Tunggu ${retrySecs} detik sebelum mencoba lagi.`,
                    })
                    throw err
                }

                toast.error("Email tidak dapat dimuat", {
                    description: getFriendlyEmailError(err),
                })
                throw err
            }
        },
        [getValidToken]
    )

    const getInbox = useCallback(
        async (_nextLink?: string): Promise<InboxResponse | null> => {
            if (!activeAccountId) return null
            const account = decryptedAccounts[activeAccountId]
            if (!account) return null
            const response = await graphCallWithRetry((token) => fetchInbox(token))
            const encryptedAccount = accounts.find((item) => item.id === activeAccountId)
            if (response && encryptedAccount) {
                logInboxMessages(encryptedAccount, response.messages).catch((error) => {
                    console.error("Failed to log inbox messages:", error)
                })
            }
            return response
        },
        [activeAccountId, accounts, decryptedAccounts, graphCallWithRetry]
    )

    const getMessageDetail = useCallback(
        async (messageId: string): Promise<MessageDetail | null> => {
            if (!activeAccountId) return null
            const account = decryptedAccounts[activeAccountId]
            if (!account) return null
            return graphCallWithRetry((token) => fetchMessageDetail(token, messageId))
        },
        [activeAccountId, decryptedAccounts, graphCallWithRetry]
    )

    const resetSession = useCallback(() => {
        setActiveAccessToken(null)
    }, [])

    return {
        getInbox,
        getMessageDetail,
        resetSession,
        hasActiveAccount: !!activeAccountId
    }
}
