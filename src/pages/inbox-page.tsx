import { useEffect, useState } from "react"
import { useGraph } from "@/hooks/useGraph"
import { useVaultStore } from "@/store/vaultStore"
import type { InboxResponse } from "@/lib/graph"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCcw, MailX, Inbox, Search } from "lucide-react"
import { isToday } from "date-fns"
import { Link, Outlet, useParams, useLocation, Navigate } from "react-router-dom"
import { loadManagedAccountSummaries, loadVaultEnabledSetting, type ManagedAccountSummary } from "@/lib/supabase"

export function InboxPage() {
    const { hasVault, hasHydrated, isLocked, activeAccountId, accounts, setActiveAccount, unlockVault } = useVaultStore()
    const { getInbox, hasActiveAccount } = useGraph()
    const { id: selectedMessageId } = useParams()
    const location = useLocation()

    const [data, setData] = useState<InboxResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [vaultEnabled, setVaultEnabled] = useState(false)
    const [managedAccounts, setManagedAccounts] = useState<ManagedAccountSummary[]>([])
    const [accessKey, setAccessKey] = useState("")
    const [unlocking, setUnlocking] = useState(false)

    const filteredMessages = data?.messages.filter(msg => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return msg.subject.toLowerCase().includes(q) || msg.from.toLowerCase().includes(q)
    })

    const loadInbox = async (nextLink?: string) => {
        setLoading(true)
        setError(null)
        try {
            const resp = await getInbox(nextLink)
            if (resp) {
                if (nextLink && data) {
                    setData({ messages: [...data.messages, ...resp.messages], nextLink: resp.nextLink })
                } else {
                    setData(resp)
                }
            }
        } catch (err: any) {
            setError(err.message || "Failed to load inbox")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (hasHydrated && !isLocked && accounts.length > 0 && !activeAccountId) {
            setActiveAccount(accounts[0].id)
            return
        }

        if (!isLocked && hasActiveAccount) {
            setData(null)
            loadInbox()
        } else {
            setData(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasHydrated, isLocked, activeAccountId, hasActiveAccount, accounts, setActiveAccount])

    useEffect(() => {
        Promise.all([
            loadVaultEnabledSetting().catch(() => false),
            loadManagedAccountSummaries().catch(() => []),
        ]).then(([enabled, summaries]) => {
            setVaultEnabled(enabled)
            setManagedAccounts(summaries)
        })
    }, [])

    // CSS media queries handle responsiveness natively now.

    if (!hasHydrated) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted-foreground">
                Menyiapkan akun...
            </div>
        )
    }

    if (!hasVault || isLocked || accounts.length === 0) {
        if (!vaultEnabled) {
            const handleAccessUnlock = async (event: React.FormEvent) => {
                event.preventDefault()
                setUnlocking(true)
                const success = await unlockVault(accessKey)
                setUnlocking(false)
                if (!success) {
                    setError("Kunci akses salah atau akun belum tersedia")
                }
            }

            return (
                <div className="flex h-full w-full items-center justify-center bg-background p-6 text-center">
                    <form onSubmit={handleAccessUnlock} className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">Buka Email</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Masukkan kunci akses yang diberikan admin untuk membuka akun email yang tersedia.
                        </p>
                        <div className="mt-4 rounded-xl border bg-background/60 p-3 text-left">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Akun tersedia</p>
                            {managedAccounts.length === 0 ? (
                                <p className="mt-2 text-sm text-muted-foreground">Belum ada akun dari admin. Muat ulang halaman setelah admin menambahkan akun.</p>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {managedAccounts.map((account) => (
                                        <div key={account.id} className="rounded-lg bg-muted/50 px-3 py-2">
                                            <p className="truncate text-sm font-medium">{account.email}</p>
                                            <p className="truncate text-[11px] text-muted-foreground">Client ID: {account.client_id}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Input
                            type="password"
                            className="mt-4 text-center"
                            placeholder="Kunci akses"
                            value={accessKey}
                            onChange={(event) => setAccessKey(event.target.value)}
                        />
                        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
                        <Button type="submit" className="mt-4 w-full" disabled={!accessKey || unlocking}>
                            {unlocking ? "Membuka..." : "Buka Email"}
                        </Button>
                    </form>
                </div>
            )
        }
        return <Navigate to="/vault" replace />
    }

    if (!activeAccountId) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted-foreground">
                Memilih akun...
            </div>
        )
    }

    return (
        <div className="flex w-full h-full overflow-hidden bg-background">
            {/* Inbox List (Pane 2) */}
            <div className={`flex flex-col shrink-0 border-r border-border/50 bg-background/95 w-full lg:w-[320px] xl:w-[380px] transition-all duration-300 ${selectedMessageId ? "hidden lg:flex" : "flex"}`}>
                <header className="flex flex-col p-4 border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-10 shrink-0 gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold tracking-tight leading-none">Email Masuk</h1>
                            <span className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                                {data?.messages.length || 0} email
                            </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => loadInbox()} disabled={loading} className="h-8 rounded-full px-3 text-xs font-medium">
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="ml-2 hidden sm:inline">Muat ulang</span>
                        </Button>
                    </div>
                    {data && data.messages.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Cari pengirim atau judul email..."
                                className="w-full bg-background/60 pl-9 h-8 text-xs rounded-full border-border/60 focus-visible:ring-1"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {error && (
                        <div className="m-4 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {loading && !data && (
                        <div className="p-2 space-y-1">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="p-3 rounded-xl border border-transparent">
                                    <div className="flex justify-between mb-2">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                    <Skeleton className="h-4 w-3/4 mb-2" />
                                    <Skeleton className="h-3 w-full" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && data?.messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <Inbox className="w-10 h-10 opacity-20 mb-3" />
                            <p className="text-sm font-medium">Tidak ada email masuk</p>
                            <p className="text-xs opacity-70 mt-1">Coba muat ulang atau pilih akun lain.</p>
                        </div>
                    )}

                    <div className="p-2 space-y-0.5">
                        {filteredMessages?.map((msg) => {
                            const isSelected = selectedMessageId === msg.id
                            const date = new Date(msg.receivedDateTime)
                            const timeString = isToday(date) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' })

                            return (
                                <Link to={`/inbox/${msg.id}`} key={msg.id} className="block group">
                                    <div className={`relative p-3 rounded-xl transition-all duration-200 border ${isSelected ? 'bg-primary/10 border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-accent/50'}`}>

                                        {/* Unread Indicator */}
                                        {!msg.isRead && (
                                            <div className="absolute left-2 top-4 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                                        )}

                                        <div className="flex flex-col pl-3">
                                            <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                                <span className={`text-sm truncate font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                                    {msg.from}
                                                </span>
                                                <span className={`text-[10px] whitespace-nowrap font-medium ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>
                                                    {timeString}
                                                </span>
                                            </div>

                                            <span className={`text-sm truncate mb-1 ${!msg.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                                                {msg.subject}
                                            </span>

                                            <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                                {msg.bodyPreview}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>

                    {data?.nextLink && (
                        <div className="p-4 flex justify-center border-t border-border/10 mt-2">
                            <Button variant="secondary" size="sm" onClick={() => loadInbox(data.nextLink)} disabled={loading} className="w-full max-w-[200px] rounded-full text-xs font-semibold h-8">
                                {loading ? "Memuat..." : "Muat Email Lama"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Message Detail (Pane 3) */}
            {selectedMessageId ? (
                <div className="flex-1 flex-col h-full bg-background/50 relative flex min-w-0 z-10 w-full overflow-hidden">
                    <Outlet key={location.pathname} />
                </div>
            ) : (
                <div className="flex-1 hidden lg:flex flex-col items-center justify-center h-full bg-muted/5 min-w-0 z-10 w-full">
                    <div className="text-center p-8 max-w-sm">
                        <MailX className="w-16 h-16 text-muted-foreground opacity-20 mx-auto mb-6" />
                        <h3 className="text-xl font-semibold tracking-tight text-foreground/80">Pilih email untuk dibaca</h3>
                        <p className="text-sm text-muted-foreground mt-2">Klik salah satu email di daftar kiri untuk melihat isi pesannya.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
