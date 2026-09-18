import { useEffect, useRef, useState } from "react"
import { useGraph } from "@/hooks/useGraph"
import { useVaultStore } from "@/store/vaultStore"
import { getFriendlyEmailError, type InboxResponse } from "@/lib/graph"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCcw, MailX, Inbox, Search } from "lucide-react"
import { isToday } from "date-fns"
import { Link, Outlet, useParams, useLocation } from "react-router-dom"
import { loadManagedAccountSummaries, type ManagedAccountSummary } from "@/lib/supabase"

export function InboxPage() {
    const { hasVault, hasHydrated, isLocked, activeAccountId, accounts, setActiveAccount, unlockVault } = useVaultStore()
    const { getInbox, hasActiveAccount } = useGraph()
    const { id: selectedMessageId } = useParams()
    const location = useLocation()

    const [data, setData] = useState<InboxResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [managedAccounts, setManagedAccounts] = useState<ManagedAccountSummary[]>([])
    const [accessKey, setAccessKey] = useState("")
    const [unlocking, setUnlocking] = useState(false)
    const latestInboxRequest = useRef(0)

    const filteredMessages = data?.messages.filter(msg => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return msg.subject.toLowerCase().includes(q) || msg.from.toLowerCase().includes(q)
    })

    const loadInbox = async (nextLink?: string) => {
        const requestId = ++latestInboxRequest.current
        setLoading(true)
        setError(null)
        try {
            const resp = await getInbox(nextLink)
            if (resp && requestId === latestInboxRequest.current) {
                if (nextLink && data) {
                    setData({ messages: [...data.messages, ...resp.messages], nextLink: resp.nextLink })
                } else {
                    setData(resp)
                }
            }
        } catch (err: any) {
            if (requestId === latestInboxRequest.current) {
                setError(getFriendlyEmailError(err))
            }
        } finally {
            if (requestId === latestInboxRequest.current) {
                setLoading(false)
            }
        }
    }

    useEffect(() => {
        if (hasHydrated && !isLocked && accounts.length > 0 && !activeAccountId) {
            setActiveAccount(accounts[0].id)
            return
        }

        if (!isLocked && hasActiveAccount) {
            latestInboxRequest.current += 1
            setData(null)
            loadInbox()
        } else {
            setData(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasHydrated, isLocked, activeAccountId, hasActiveAccount, accounts, setActiveAccount])

    useEffect(() => {
        loadManagedAccountSummaries().then(setManagedAccounts).catch(() => setManagedAccounts([]))
    }, [])

    // CSS media queries handle responsiveness natively now.

    if (!hasHydrated) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-[#720002]/60">
                Menyiapkan akun...
            </div>
        )
    }

    if (!hasVault || isLocked || accounts.length === 0) {
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
            <div className="flex h-full w-full items-center justify-center p-6 text-center">
                <form onSubmit={handleAccessUnlock} className="user-glass-card relative w-full max-w-md overflow-hidden rounded-[2rem] p-7">
                        <div className="absolute inset-x-0 top-0 h-2 user-berry-gradient" />
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4D6DC] text-[#720002] shadow-inner">
                            <MailX className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-[#720002]">Buka Email</h2>
                        <p className="mt-2 text-sm text-[#720002]/65">
                            Masukkan kunci akses yang diberikan admin untuk membuka akun email yang tersedia.
                        </p>
                        <div className="mt-5 rounded-2xl border border-[#720002]/10 bg-white/65 p-3 text-left shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-black uppercase tracking-wider text-[#720002]/60">Pilih akun</p>
                                {managedAccounts.length > 0 && <span className="rounded-full bg-[#F4D6DC] px-2 py-0.5 text-[10px] font-bold text-[#720002]">{managedAccounts.length} akun</span>}
                            </div>
                            {managedAccounts.length === 0 ? (
                                <p className="mt-2 text-sm text-[#720002]/60">Belum ada akun dari admin. Muat ulang halaman setelah admin menambahkan akun.</p>
                            ) : (
                                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                                    {managedAccounts.map((account) => (
                                        <div key={account.id} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-[#F4D6DC]/75">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DB8291] text-[10px] font-black text-[#720002]">{account.email.slice(0, 1).toUpperCase()}</span>
                                            <p className="truncate text-sm font-bold text-[#720002]">{account.email}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Input
                            type="password"
                            className="mt-4 h-12 rounded-2xl border-[#720002]/15 bg-white/80 text-center font-semibold text-[#720002] focus-visible:ring-[#DB8291]/40"
                            placeholder="Kunci akses"
                            value={accessKey}
                            onChange={(event) => setAccessKey(event.target.value)}
                        />
                        {error && <p className="mt-3 text-xs font-medium text-[#720002]">{error}</p>}
                        <Button type="submit" className="user-berry-gradient mt-4 h-12 w-full rounded-2xl font-bold text-white shadow-lg shadow-[#720002]/20 hover:opacity-95" disabled={!accessKey || unlocking}>
                            {unlocking ? "Membuka..." : "Buka Email"}
                        </Button>
                </form>
            </div>
        )
    }

    if (!activeAccountId) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-[#720002]/60">
                Memilih akun...
            </div>
        )
    }

    return (
        <div className="flex w-full h-full overflow-hidden">
            {/* Inbox List (Pane 2) */}
            <div className={`flex flex-col shrink-0 border-r border-[#720002]/10 bg-white/72 backdrop-blur-2xl w-full lg:w-[340px] xl:w-[400px] transition-all duration-300 ${selectedMessageId ? "hidden lg:flex" : "flex"}`}>
                <header className="flex flex-col p-4 border-b border-[#720002]/10 bg-white/55 backdrop-blur-md sticky top-0 z-10 shrink-0 gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black tracking-tight leading-none text-[#720002]">Email Masuk</h1>
                            <span className="text-[10px] text-[#720002]/55 font-bold mt-1 uppercase tracking-wider">
                                {data?.messages.length || 0} email
                            </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => loadInbox()} disabled={loading} className="h-9 rounded-full border-[#720002]/15 bg-white/70 px-3 text-xs font-bold text-[#720002] hover:bg-[#F4D6DC]">
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="ml-2 hidden sm:inline">Muat ulang</span>
                        </Button>
                    </div>
                    {data && data.messages.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#720002]/45" />
                            <Input
                                type="text"
                                placeholder="Cari pengirim atau judul email..."
                                className="w-full bg-white/80 pl-9 h-9 text-xs rounded-full border-[#720002]/15 focus-visible:ring-[#DB8291]/40 text-[#720002] placeholder:text-[#720002]/40"
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
                            <Inbox className="w-10 h-10 text-[#DB8291] opacity-60 mb-3" />
                            <p className="text-sm font-bold text-[#720002]">Tidak ada email masuk</p>
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
                                    <div className={`relative p-3 rounded-2xl transition-all duration-200 border ${isSelected ? 'bg-[#F4D6DC] border-[#720002]/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/70 hover:border-[#720002]/10'}`}>

                                        {/* Unread Indicator */}
                                        {!msg.isRead && (
                                            <div className="absolute left-2 top-4 w-2 h-2 rounded-full bg-[#720002] ring-2 ring-white" />
                                        )}

                                        <div className="flex flex-col pl-3">
                                            <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                                <span className={`text-sm truncate font-bold ${isSelected ? 'text-[#720002]' : 'text-[#2a0709]'}`}>
                                                    {msg.from}
                                                </span>
                                                <span className={`text-[10px] whitespace-nowrap font-bold ${isSelected ? 'text-[#720002]/70' : 'text-[#720002]/45'}`}>
                                                    {timeString}
                                                </span>
                                            </div>

                                            <span className={`text-sm truncate mb-1 ${!msg.isRead ? 'font-bold text-[#2a0709]' : 'text-[#720002]/65'}`}>
                                                {msg.subject}
                                            </span>

                                            <span className="text-xs text-[#720002]/55 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
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
                <div className="flex-1 flex-col h-full relative flex min-w-0 z-10 w-full overflow-hidden">
                    <Outlet key={location.pathname} />
                </div>
            ) : (
                <div className="flex-1 hidden lg:flex flex-col items-center justify-center h-full bg-white/30 min-w-0 z-10 w-full">
                    <div className="text-center p-8 max-w-sm">
                        <MailX className="w-16 h-16 text-[#DB8291] opacity-70 mx-auto mb-6" />
                        <h3 className="text-xl font-black tracking-tight text-[#720002]">Pilih email untuk dibaca</h3>
                        <p className="text-sm text-[#720002]/60 mt-2">Klik salah satu email di daftar kiri untuk melihat isi pesannya.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
