import { useState, useEffect } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { ChevronDown, Mail, WifiOff } from "lucide-react"
import { useVaultStore } from "@/store/vaultStore"

export function AppLayout() {
    const { pathname } = useLocation()
    const { activeAccountId, accounts, isLocked, setActiveAccount } = useVaultStore()
    const activeAccount = accounts.find(a => a.id === activeAccountId)
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
    const [accountSearch, setAccountSearch] = useState("")
    const isInbox = pathname.startsWith("/inbox")
    const showNavigation = !isLocked && accounts.length > 0
    const visibleAccounts = accounts.filter((account) => account.email.toLowerCase().includes(accountSearch.trim().toLowerCase()))

    useEffect(() => {
        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)
        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)
        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [])

    useEffect(() => {
        if (accountSearch.trim() && visibleAccounts.length === 1 && visibleAccounts[0].id !== activeAccountId) {
            setActiveAccount(visibleAccounts[0].id)
        }
    }, [accountSearch, activeAccountId, setActiveAccount, visibleAccounts])

    return (
        <div className="user-shell user-brand-bg flex min-h-screen w-full relative overflow-hidden text-[#2a0709]">
            <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden relative">
                {showNavigation && (
                    <header className="hidden md:flex h-16 shrink-0 items-center justify-between border-b border-[#720002]/10 bg-white/75 px-6 backdrop-blur-2xl">
                        <div className="flex items-center gap-1">
                            <Link to="/inbox" className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${isInbox ? "bg-[#720002] text-white" : "text-[#720002] hover:bg-[#F4D6DC]"}`}>
                                Email Masuk
                            </Link>
                        </div>
                        <div className="flex items-center gap-3">
                            {accounts.length > 1 && (
                                <Input
                                    type="search"
                                    value={accountSearch}
                                    onChange={(event) => setAccountSearch(event.target.value)}
                                    placeholder="Cari email..."
                                    className="h-8 w-40 rounded-lg text-xs"
                                />
                            )}
                            <select
                                className="max-w-64 rounded-xl border border-[#720002]/15 bg-white px-3 py-2 text-sm font-bold text-[#720002] outline-none"
                                value={activeAccountId || ""}
                                onChange={(event) => setActiveAccount(event.target.value)}
                            >
                                {visibleAccounts.length === 0 && <option disabled>Tidak ada akun ditemukan</option>}
                                {visibleAccounts.map((account) => <option key={account.id} value={account.id}>{account.email}</option>)}
                            </select>
                            <ModeToggle />
                        </div>
                    </header>
                )}
                    <header className="md:hidden border-b border-[#720002]/10 bg-white/75 backdrop-blur-2xl shrink-0">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="user-berry-gradient flex h-10 w-10 items-center justify-center rounded-2xl text-white shrink-0 shadow-lg shadow-[#720002]/20">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold leading-none text-[#720002]">Pembaca Email</span>
                                    <span className="text-[10px] text-[#720002]/60 mt-1 truncate max-w-[180px]">
                                        {accounts.length > 1 ? `${accounts.length} akun tersedia` : activeAccount?.email || "Belum ada akun"}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <ModeToggle />
                            </div>
                        </div>

                        {accounts.length > 1 && (
                            <div className="px-4 pb-3">
                                <label htmlFor="mobile-account-switcher" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#720002]/60">Pilih akun</label>
                                <Input
                                    type="search"
                                    value={accountSearch}
                                    onChange={(event) => setAccountSearch(event.target.value)}
                                    placeholder="Cari email..."
                                    className="mb-2 h-10 rounded-xl text-sm"
                                />
                                <div className="relative">
                                    <select
                                        id="mobile-account-switcher"
                                        className="w-full appearance-none rounded-2xl border border-[#720002]/15 bg-white/80 px-3 py-3 pr-10 text-sm font-bold shadow-sm outline-none transition-colors focus:border-[#DB8291] focus:ring-2 focus:ring-[#DB8291]/30 text-[#720002]"
                                        value={activeAccountId || ""}
                                        onChange={(e) => setActiveAccount(e.target.value)}
                                    >
                                        {visibleAccounts.length === 0 && <option disabled>Tidak ada akun ditemukan</option>}
                                        {visibleAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.email}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                </div>
                            </div>
                        )}

                        {accounts.length === 1 && activeAccount && (
                            <div className="px-4 pb-3">
                                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#720002]/60">Akun aktif</span>
                                <div
                                    className="rounded-2xl border border-[#720002]/15 bg-white/75 px-3 py-2 text-sm font-bold truncate text-[#720002]"
                                    title={activeAccount.email}
                                >
                                    {activeAccount.email}
                                </div>
                            </div>
                        )}
                    </header>

                    <main className="flex-1 flex flex-col overflow-hidden relative h-full">
                        {isOffline && (
                            <div className="bg-destructive text-destructive-foreground px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 shrink-0 shadow-sm z-50 animate-in slide-in-from-top-2">
                                <WifiOff className="w-3.5 h-3.5" />
                                Koneksi internet terputus. Periksa jaringan Anda.
                            </div>
                        )}
                        <Outlet />
                    </main>

                    {/* Mobile Bottom Nav */}
                    <nav className="md:hidden flex border-t border-[#720002]/10 bg-white/80 backdrop-blur-2xl pb-safe shrink-0">
                        <Link to="/inbox" className={`flex-1 flex flex-col items-center justify-center py-3 ${isInbox ? 'text-[#720002] bg-[#F4D6DC]/70' : 'text-[#720002]/55 hover:text-[#720002]'}`}>
                            <Mail className="w-5 h-5 mb-1" />
                            <span className="text-[10px] uppercase font-medium">Email</span>
                        </Link>
                    </nav>
            </div>
        </div>
    )
}
