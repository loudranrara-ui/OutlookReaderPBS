import { useState, useEffect } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { ChevronDown, Mail, Shield, WifiOff } from "lucide-react"
import { useVaultStore } from "@/store/vaultStore"
import { loadVaultEnabledSetting } from "@/lib/supabase"

export function AppLayout() {
    const { pathname } = useLocation()
    const { activeAccountId, accounts, setActiveAccount } = useVaultStore()
    const activeAccount = accounts.find(a => a.id === activeAccountId)
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
    const [vaultEnabled, setVaultEnabled] = useState(false)
    const isInbox = pathname.startsWith("/inbox")
    const isVault = pathname.startsWith("/vault")

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
        loadVaultEnabledSetting()
            .then(setVaultEnabled)
            .catch(() => setVaultEnabled(false))
    }, [])

    return (
        <SidebarProvider>
            <div className="user-shell user-brand-bg flex min-h-screen w-full relative overflow-hidden text-[#2a0709]">
                {/* Desktop Sidebar */}
                <Sidebar className="hidden md:flex border-r border-[#720002]/10 bg-white/70 backdrop-blur-2xl">
                    <SidebarHeader className="p-4 flex flex-col gap-4">
                        <div className="user-glass-card flex items-center gap-3 rounded-3xl p-3">
                            <div className="user-berry-gradient flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg shadow-[#720002]/20">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="block font-bold text-base leading-none text-[#720002]">Pembaca Email</span>
                                <span className="mt-1 block text-xs text-[#720002]/60">Outlook & Hotmail</span>
                            </div>
                        </div>

                        {accounts.length > 0 && (
                            <div className="user-glass-card p-3 rounded-2xl text-sm flex flex-col gap-2">
                                <span className="text-[10px] text-[#720002]/60 font-bold uppercase tracking-wider">Akun yang dibuka</span>
                                <select
                                    className="w-full rounded-xl border border-[#720002]/15 bg-white/70 px-2 py-2 font-semibold truncate focus:ring-2 focus:ring-[#DB8291]/40 cursor-pointer text-sm outline-none text-[#720002]"
                                    value={activeAccountId || ""}
                                    onChange={(e) => setActiveAccount(e.target.value)}
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.email}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </SidebarHeader>
                    <SidebarContent className="px-2">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isInbox} tooltip="Email Masuk">
                                    <Link to="/inbox">
                                        <Mail />
                                        <span>Email Masuk</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {vaultEnabled && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={isVault} tooltip="Kelola Akun">
                                        <Link to="/vault">
                                            <Shield />
                                            <span>Kelola Akun</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter className="p-4 flex flex-row justify-between items-center bg-[#F4D6DC]/30 border-t border-[#720002]/10 mt-auto gap-2">
                        <span className="text-xs font-medium text-[#720002]/60">Data terenkripsi</span>
                        <ModeToggle />
                    </SidebarFooter>
                </Sidebar>

                {/* Main Content Area */}
                <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden relative">
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
                                <div className="relative">
                                    <select
                                        id="mobile-account-switcher"
                                        className="w-full appearance-none rounded-2xl border border-[#720002]/15 bg-white/80 px-3 py-3 pr-10 text-sm font-bold shadow-sm outline-none transition-colors focus:border-[#DB8291] focus:ring-2 focus:ring-[#DB8291]/30 text-[#720002]"
                                        value={activeAccountId || ""}
                                        onChange={(e) => setActiveAccount(e.target.value)}
                                    >
                                        {accounts.map(acc => (
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
                        {vaultEnabled && (
                            <Link to="/vault" className={`flex-1 flex flex-col items-center justify-center py-3 ${isVault ? 'text-[#720002] bg-[#F4D6DC]/70' : 'text-[#720002]/55 hover:text-[#720002]'}`}>
                                <Shield className="w-5 h-5 mb-1" />
                                <span className="text-[10px] uppercase font-medium">Akun</span>
                            </Link>
                        )}
                    </nav>
                </div>
            </div>
        </SidebarProvider>
    )
}
