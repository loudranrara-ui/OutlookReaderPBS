import type { ParsedCredential } from "./validation"

export interface TokenResponse {
    accessToken: string
    expiresIn: number
    refreshToken?: string
}

export interface InboxMessage {
    id: string
    subject: string
    from: string
    bodyPreview: string
    receivedDateTime: string
    isRead: boolean
}

export interface InboxResponse {
    messages: InboxMessage[]
    nextLink?: string
}

export interface MessageDetail {
    id: string
    subject: string
    from: string
    toRecipients: string[]
    bodyPreview: string
    bodyHtmlRaw: string
    bodyHtmlSanitized?: string // populated by UI
}

export function getFriendlyEmailError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error || "")
    const normalized = message.toLowerCase()

    if (normalized.includes("invalid_grant") || normalized.includes("invalid token") || normalized.includes("token has expired")) {
        return "Akun ini tidak dapat dibuka karena token aksesnya sudah tidak berlaku. Hubungi admin untuk memperbarui akun."
    }
    if (normalized.includes("invalid_client") || normalized.includes("client secret")) {
        return "Konfigurasi aplikasi Microsoft untuk akun ini tidak valid. Hubungi admin."
    }
    if (normalized.includes("access denied") || normalized.includes("authorization_requestdenied") || normalized.includes("forbidden")) {
        return "Microsoft menolak akses ke email ini. Periksa izin akun atau hubungi admin."
    }
    if (normalized.includes("unauthorized_access_token")) {
        return "Sesi akun ini sudah berakhir. Sistem sedang mencoba memperbarui aksesnya."
    }
    if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("fetcherror")) {
        return "Tidak dapat terhubung ke Microsoft. Periksa koneksi internet lalu coba lagi."
    }
    if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
        return "Terlalu banyak permintaan ke Microsoft. Tunggu sebentar lalu coba lagi."
    }

    return "Email tidak dapat dimuat saat ini. Coba lagi atau hubungi admin bila masalah berlanjut."
}

interface GraphEmailAddress {
    emailAddress?: {
        address?: string
        name?: string
    }
}

interface GraphMessage {
    id: string
    subject?: string
    from?: GraphEmailAddress
    toRecipients?: GraphEmailAddress[]
    bodyPreview?: string
    receivedDateTime?: string
    isRead?: boolean
    body?: {
        content?: string
    }
}

const USE_DIRECT_OAUTH = import.meta.env.VITE_USE_OAUTH_PROXY === "false"
const LIVE_TOKEN_URL = USE_DIRECT_OAUTH ? "https://login.live.com/oauth20_token.srf" : (import.meta.env.VITE_TOKEN_URL || "/api/token")

/**
 * Exchanges the refresh token for a new access token using the Live SDK OAuth2 endpoint.
 * Matches Python requests.post('https://login.live.com/oauth20_token.srf', data={client_id, grant_type, refresh_token}).
 */
export async function exchangeRefreshToken(account: ParsedCredential): Promise<TokenResponse> {
    const body = new URLSearchParams()
    body.append("client_id", account.clientId)
    body.append("grant_type", "refresh_token")
    body.append("refresh_token", account.refreshToken)

    const res = await fetch(LIVE_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
        const errorDesc = data.error_description || data.error || res.statusText || "Token exchange failed"
        console.error("[OAuth Exchange Error]:", data)
        throw new Error(errorDesc)
    }

    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token || account.refreshToken,
    }
}

async function graphRequest<T>(path: string, accessToken: string): Promise<T> {
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    if (!res.ok) {
        if (res.status === 401) {
            throw new Error("UNAUTHORIZED_ACCESS_TOKEN")
        }
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || err.error || "Microsoft Graph request failed")
    }

    return res.json()
}

function formatAddress(recipient?: GraphEmailAddress): string {
    const address = recipient?.emailAddress?.address
    const name = recipient?.emailAddress?.name
    return name && address ? `${name} <${address}>` : address || name || "Unknown"
}

export async function fetchInbox(accessToken: string): Promise<InboxResponse> {
    const data = await graphRequest<{ value: GraphMessage[] }>(
        "/me/mailFolders/inbox/messages?$select=id,subject,from,bodyPreview,receivedDateTime,isRead&$orderby=receivedDateTime%20desc&$top=100",
        accessToken,
    )

    return {
        messages: data.value.map((message) => ({
            id: message.id,
            subject: message.subject || "(No Subject)",
            from: formatAddress(message.from),
            bodyPreview: message.bodyPreview || "",
            receivedDateTime: message.receivedDateTime || new Date().toISOString(),
            isRead: message.isRead || false,
        })),
    }
}

export async function fetchMessageDetail(accessToken: string, messageId: string): Promise<MessageDetail> {
    const message = await graphRequest<GraphMessage>(
        `/me/messages/${encodeURIComponent(messageId)}?$select=id,subject,from,toRecipients,bodyPreview,body`,
        accessToken,
    )

    return {
        id: message.id,
        subject: message.subject || "(No Subject)",
        from: formatAddress(message.from),
        toRecipients: message.toRecipients?.map(formatAddress) || [],
        bodyPreview: message.bodyPreview || "",
        bodyHtmlRaw: message.body?.content || message.bodyPreview || "",
    }
}
