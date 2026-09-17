import { useState, useEffect } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { ChevronDown, Mail, Shield, WifiOff } from "lucide-react"
import { useVaultStore } from "@/store/vaultStore"

export function AppLayout() {
    const { pathname } = useLocation()
    const { activeAccountId, accounts, setActiveAccount } = useVaultStore()
    const activeAccount = accounts.find(a => a.id === activeAccountId)
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
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

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background relative overflow-hidden">
                {/* Desktop Sidebar */}
                <Sidebar className="hidden md:flex border-r border-border bg-card/95">
                    <SidebarHeader className="p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-3 rounded-2xl bg-primary/10 p-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="block font-semibold text-base leading-none">Pembaca Email</span>
                                <span className="mt-1 block text-xs text-muted-foreground">Outlook & Hotmail</span>
                            </div>
                        </div>

                        {accounts.length > 0 && (
                            <div className="bg-background p-3 rounded-xl border text-sm flex flex-col gap-2 shadow-sm">
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Akun yang dibuka</span>
                                <select
                                    className="w-full rounded-lg border border-border/70 bg-muted/50 px-2 py-2 font-medium truncate focus:ring-2 focus:ring-primary/20 cursor-pointer text-sm outline-none"
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
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={isVault} tooltip="Kelola Akun">
                                    <Link to="/vault">
                                        <Shield />
                                        <span>Kelola Akun</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter className="p-4 flex flex-row justify-between items-center bg-muted/20 border-t border-border mt-auto gap-2">
                        <span className="text-xs text-muted-foreground">Data tersimpan lokal</span>
                        <ModeToggle />
                    </SidebarFooter>
                </Sidebar>

                {/* Main Content Area */}
                <div className="flex flex-col flex-1 min-w-0 bg-background h-screen overflow-hidden relative">
                    <header className="md:hidden border-b border-border bg-card shrink-0">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold leading-none">Pembaca Email</span>
                                    <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-[180px]">
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
                                <label htmlFor="mobile-account-switcher" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pilih akun</label>
                                <div className="relative">
                                    <select
                                        id="mobile-account-switcher"
                                        className="w-full appearance-none rounded-xl border border-border/70 bg-background/80 px-3 py-3 pr-10 text-sm font-semibold shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Akun aktif</span>
                                <div
                                    className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm font-medium truncate text-foreground"
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
                    <nav className="md:hidden flex border-t border-border bg-card pb-safe shrink-0">
                        <Link to="/inbox" className={`flex-1 flex flex-col items-center justify-center py-3 ${isInbox ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}>
                            <Mail className="w-5 h-5 mb-1" />
                            <span className="text-[10px] uppercase font-medium">Email</span>
                        </Link>
                        <Link to="/vault" className={`flex-1 flex flex-col items-center justify-center py-3 ${isVault ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground'}`}>
                            <Shield className="w-5 h-5 mb-1" />
                            <span className="text-[10px] uppercase font-medium">Akun</span>
                        </Link>
                    </nav>
                </div>
            </div>
        </SidebarProvider>
    )
}
