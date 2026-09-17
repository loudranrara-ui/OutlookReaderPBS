import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { decryptAccount } from "@/lib/crypto"
import { exchangeRefreshToken, fetchMessageDetail, type MessageDetail } from "@/lib/graph"
import type { InboxLogRow, SupabaseAccountRow } from "@/lib/supabase"
import { LayoutDashboard, LockKeyhole, Mail, RefreshCcw, Settings, ShieldCheck, Trash2, Users } from "lucide-react"
import { NavLink } from "react-router-dom"
import DOMPurify from "dompurify"

interface AdminLoginCardProps {
    email: string
    password: string
    loading: boolean
    onEmailChange: (value: string) => void
    onPasswordChange: (value: string) => void
    onSubmit: (event: React.FormEvent) => void
}

export interface AdminDashboardProps {
    loading: boolean
    accounts: SupabaseAccountRow[]
    logs: InboxLogRow[]
    selectedAccountId: string
    vaultEnabled: boolean
    newAccountCredential: string
    newAccountKey: string
    onRefresh: () => void
    onSignOut: () => void
    onToggleVault: () => void
    onAddAccount: (event: React.FormEvent) => void
    onCredentialChange: (value: string) => void
    onKeyChange: (value: string) => void
    onFilterChange: (accountId: string) => void
    onClearFilter: () => void
    onDeleteAccount: (accountId: string) => void
}

export function AdminMissingConfig() {
    return (
        <div className="min-h-screen bg-background p-6 flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Supabase belum aktif</CardTitle>
                    <CardDescription>Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk memakai halaman admin.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}

export function AdminLoginCard({ email, password, loading, onEmailChange, onPasswordChange, onSubmit }: AdminLoginCardProps) {
    return (
        <div className="brand-neo-bg min-h-screen p-4 flex items-center justify-center">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <CardTitle>Admin Panel</CardTitle>
                    <CardDescription>Masuk dengan akun Supabase admin untuk mengelola akun Outlook dan melihat log email masuk.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <Input type="email" placeholder="Email admin" value={email} onChange={(event) => onEmailChange(event.target.value)} required />
                        <Input type="password" placeholder="Password" value={password} onChange={(event) => onPasswordChange(event.target.value)} required />
                        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Memproses..." : "Masuk Admin"}</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

function adminNavClass({ isActive }: { isActive: boolean }) {
    return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`
}

function AdminSidebar() {
    return (
        <aside className="hidden w-72 shrink-0 border-r-3 border-foreground bg-[#F4D6DC] lg:flex lg:flex-col">
            <div className="border-b-3 border-foreground p-5">
                <div className="neo-card flex items-center gap-3 rounded-sm bg-white p-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-sm border-3 border-foreground bg-[#720002] text-white shadow-[3px_3px_0_#190304]">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-black leading-none text-[#720002]">Admin Dashboard</p>
                        <p className="mt-1 text-xs font-bold text-[#720002]/70">Outlook Reader</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 space-y-1 p-3">
                <NavLink to="/admin" end className={adminNavClass}><LayoutDashboard className="h-4 w-4" /> Ringkasan</NavLink>
                <NavLink to="/admin/add-account" className={adminNavClass}><LockKeyhole className="h-4 w-4" /> Tambah Akun</NavLink>
                <NavLink to="/admin/accounts" className={adminNavClass}><Users className="h-4 w-4" /> Akun</NavLink>
                <NavLink to="/admin/logs" className={adminNavClass}><Mail className="h-4 w-4" /> Log Email</NavLink>
                <NavLink to="/admin/settings" className={adminNavClass}><Settings className="h-4 w-4" /> Pengaturan</NavLink>
            </nav>
            <div className="border-t-3 border-foreground bg-[#DB8291] p-4 text-xs font-black text-[#190304]">Data akun tetap terenkripsi di Supabase.</div>
        </aside>
    )
}

function AdminTopbar({ loading, onRefresh, onSignOut }: Pick<AdminDashboardProps, "loading" | "onRefresh" | "onSignOut">) {
    return (
        <header className="sticky top-0 z-20 border-b-3 border-foreground bg-[#FFF8F9] px-4 py-3 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#720002]">Admin Panel</p>
                    <h1 className="text-xl font-black tracking-tight md:text-2xl">Kelola Akun & Log Email</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onRefresh} disabled={loading}>
                        <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Muat ulang
                    </Button>
                    <Button variant="outline" onClick={onSignOut}>Keluar</Button>
                </div>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                <NavLink to="/admin" end className={adminNavClass}><LayoutDashboard className="h-4 w-4" /> Ringkasan</NavLink>
                <NavLink to="/admin/add-account" className={adminNavClass}><LockKeyhole className="h-4 w-4" /> Tambah</NavLink>
                <NavLink to="/admin/accounts" className={adminNavClass}><Users className="h-4 w-4" /> Akun</NavLink>
                <NavLink to="/admin/logs" className={adminNavClass}><Mail className="h-4 w-4" /> Log</NavLink>
                <NavLink to="/admin/settings" className={adminNavClass}><Settings className="h-4 w-4" /> Setting</NavLink>
            </nav>
        </header>
    )
}

export function AdminShell({ loading, onRefresh, onSignOut, children }: Pick<AdminDashboardProps, "loading" | "onRefresh" | "onSignOut"> & { children: React.ReactNode }) {
    return (
        <div className="brand-neo-bg min-h-screen text-foreground">
            <div className="flex min-h-screen">
                <AdminSidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <AdminTopbar loading={loading} onRefresh={onRefresh} onSignOut={onSignOut} />
                    <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
                    <footer className="border-t-3 border-foreground bg-[#720002] px-4 py-3 text-xs font-black text-white md:px-6">
                        Admin dashboard berjalan di Vercel dan terhubung ke Supabase Auth, Database, dan RLS.
                    </footer>
                </div>
            </div>
        </div>
    )
}

export function StatCards({ accounts, logs, selectedAccountId, onFilterChange }: Pick<AdminDashboardProps, "accounts" | "logs" | "selectedAccountId" | "onFilterChange">) {
    return (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="brand-panel-cream">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Total Akun</CardTitle></CardHeader>
                <CardContent className="text-3xl font-bold">{accounts.length}</CardContent>
            </Card>
            <Card className="brand-panel-pink">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4" /> Log Ditampilkan</CardTitle></CardHeader>
                <CardContent className="text-3xl font-bold">{logs.length}</CardContent>
            </Card>
            <Card className="brand-panel-rose">
                <CardHeader className="pb-3"><CardTitle className="text-base">Filter Log</CardTitle></CardHeader>
                <CardContent>
                    <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={selectedAccountId} onChange={(event) => onFilterChange(event.target.value)}>
                        <option value="">Semua akun</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{account.email}</option>)}
                    </select>
                </CardContent>
            </Card>
        </section>
    )
}

export function SettingsPanel({ vaultEnabled, loading, onToggleVault }: Pick<AdminDashboardProps, "vaultEnabled" | "loading" | "onToggleVault">) {
    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="brand-panel-cream">
                <CardHeader>
                    <CardTitle>Pengaturan Tampilan User</CardTitle>
                    <CardDescription>Atur apakah pengguna boleh melihat menu Kelola Akun di halaman utama.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-xl border bg-muted/30 p-4">
                        <p className="text-sm text-muted-foreground">Status menu Kelola Akun</p>
                        <p className="mt-1 text-lg font-semibold">{vaultEnabled ? "Ditampilkan" : "Disembunyikan"}</p>
                    </div>
                    <Button variant="outline" onClick={onToggleVault} disabled={loading}>
                        {vaultEnabled ? "Sembunyikan Vault dari User" : "Tampilkan Vault untuk User"}
                    </Button>
                </CardContent>
            </Card>

            <Card className="brand-panel-pink">
                <CardHeader>
                    <CardTitle>Flow Aktif</CardTitle>
                    <CardDescription>Ringkasan cara aplikasi utama bekerja setelah refactor admin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>1. Admin menambahkan akun Outlook dari halaman Tambah Akun.</p>
                    <p>2. Akun disimpan terenkripsi di Supabase sebagai admin-managed account.</p>
                    <p>3. User membuka halaman Email dan memasukkan kunci akses dari admin.</p>
                    <p>4. LocalStorage akun user tidak dipakai saat Supabase aktif.</p>
                </CardContent>
            </Card>
        </div>
    )
}

export function AddAccountPanel({ loading, newAccountCredential, onAddAccount, onCredentialChange }: Pick<AdminDashboardProps, "loading" | "newAccountCredential" | "newAccountKey" | "onAddAccount" | "onCredentialChange" | "onKeyChange">) {
    return (
        <Card id="add-account" className="brand-panel-cream">
            <CardHeader>
                <CardTitle>Tambah Akun Outlook</CardTitle>
                <CardDescription>Akun ditambahkan oleh admin dan terenkripsi memakai kunci admin dari environment.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onAddAccount} className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <Input placeholder="email:password:refresh_token:client_id atau pakai pemisah |" value={newAccountCredential} onChange={(event) => onCredentialChange(event.target.value)} />
                    <Button type="submit" disabled={loading || !newAccountCredential}>Tambah</Button>
                </form>
                <p className="mt-3 text-xs text-muted-foreground">Akun dienkripsi memakai VITE_ADMIN_ACCOUNT_KEY dari environment Vercel.</p>
            </CardContent>
        </Card>
    )
}

export function AccountListPanel({ accounts, selectedAccountId, onFilterChange, onClearFilter, onDeleteAccount }: Pick<AdminDashboardProps, "accounts" | "selectedAccountId" | "onFilterChange" | "onClearFilter" | "onDeleteAccount">) {
    return (
        <Card id="accounts" className="brand-panel-cream overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle>Akun di Database</CardTitle>
                        <CardDescription>Klik card untuk memfilter log pesan masuk.</CardDescription>
                    </div>
                    {selectedAccountId && <Button variant="outline" size="sm" onClick={onClearFilter}>Semua log</Button>}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {accounts.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada akun tersimpan.</p>
                ) : accounts.map((account) => (
                    <div
                        key={account.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onFilterChange(account.id)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                onFilterChange(account.id)
                            }
                        }}
                        className={`w-full rounded-sm border-3 border-foreground p-3 text-left shadow-[4px_4px_0_#190304] transition-colors ${selectedAccountId === account.id ? "bg-[#DB8291]" : "bg-white hover:bg-[#F4D6DC]"}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground hover:text-primary hover:underline">{account.email}</p>
                                {account.is_admin_managed && <p className="mt-1 text-xs font-black text-[#720002]">Admin-managed</p>}
                                <p className="mt-1 truncate text-xs text-muted-foreground">Client ID: {account.client_id}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Dibuat: {new Date(account.created_at_ms).toLocaleString()}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onDeleteAccount(account.id)
                                }}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export function LatestLogsPreview({ logs }: Pick<AdminDashboardProps, "logs">) {
    const latestLogs = logs.slice(0, 10)

    return (
        <Card className="brand-panel-pink">
            <CardHeader>
                <CardTitle>10 Email Terbaru</CardTitle>
                <CardDescription>Ringkasan email terbaru yang tercatat dari semua akun atau akun yang sedang difilter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {latestLogs.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada log email.</p>
                ) : latestLogs.map((log) => (
                    <div key={log.id} className="rounded-sm border-3 border-foreground bg-white p-3 shadow-[4px_4px_0_#190304]">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{log.subject}</p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">{log.sender}</p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">{log.account_email}</p>
                            </div>
                            <span className={`shrink-0 rounded-sm border-2 border-foreground px-2 py-1 text-xs font-black ${log.is_read ? "bg-[#F4D6DC] text-[#190304]" : "bg-[#720002] text-white"}`}>
                                {log.is_read ? "Dibaca" : "Baru"}
                            </span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

export function InboxLogTable({ logs, accounts, selectedAccountId, onFilterChange, onClearFilter }: Pick<AdminDashboardProps, "logs" | "accounts" | "selectedAccountId" | "onFilterChange" | "onClearFilter">) {
    const [selectedLog, setSelectedLog] = useState<InboxLogRow | null>(null)
    const [message, setMessage] = useState<MessageDetail | null>(null)
    const [viewerError, setViewerError] = useState<string | null>(null)
    const [viewerLoading, setViewerLoading] = useState(false)
    const [viewerOpen, setViewerOpen] = useState(false)

    const openMessageForLog = async (log: InboxLogRow) => {
        const adminAccountKey = import.meta.env.VITE_ADMIN_ACCOUNT_KEY || ""
        if (!adminAccountKey) {
            setViewerError("VITE_ADMIN_ACCOUNT_KEY belum dikonfigurasi")
            return
        }

        const account = accounts.find((item) => item.id === log.account_id)
        if (!account) {
            setViewerError("Data akun tidak ditemukan")
            return
        }

        setViewerLoading(true)
        setViewerError(null)
        setMessage(null)

        try {
            const parsed = await decryptAccount({
                id: account.id,
                email: account.email,
                clientId: account.client_id,
                cipherText: account.cipher_text,
                iv: account.iv,
                salt: account.salt,
                createdAt: account.created_at_ms,
                updatedAt: account.updated_at_ms,
            }, adminAccountKey)
            const token = await exchangeRefreshToken(parsed)
            const detail = await fetchMessageDetail(token.accessToken, log.message_id)
            setMessage(detail)
        } catch (error: any) {
            setViewerError(error.message || "Gagal membuka email")
        } finally {
            setViewerLoading(false)
        }
    }

    const cleanHtml = message ? DOMPurify.sanitize(message.bodyHtmlRaw, { USE_PROFILES: { html: true }, ADD_ATTR: ["target"] }) : ""

    return (
        <>
            <Card id="logs" className="brand-panel-cream overflow-hidden">
                <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <CardTitle>Log Email Masuk</CardTitle>
                            <CardDescription>Klik baris log untuk membuka isi email. Maksimal 300 log terbaru ditampilkan.</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={selectedAccountId} onChange={(event) => onFilterChange(event.target.value)}>
                                <option value="">Semua akun</option>
                                {accounts.map((account) => <option key={account.id} value={account.id}>{account.email}</option>)}
                            </select>
                            {selectedAccountId && <Button variant="outline" onClick={onClearFilter}>Reset filter</Button>}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-sm border-3 border-foreground bg-white">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-[#720002] text-left text-xs uppercase tracking-wider text-white">
                                <tr>
                                    <th className="px-3 py-2">Akun</th>
                                    <th className="px-3 py-2">Pengirim</th>
                                    <th className="px-3 py-2">Judul</th>
                                    <th className="px-3 py-2">Diterima</th>
                                    <th className="px-3 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {logs.length === 0 ? (
                                    <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Belum ada log email.</td></tr>
                                ) : logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className={`cursor-pointer align-top hover:bg-[#F4D6DC] ${selectedLog?.id === log.id ? "bg-[#DB8291]/70" : ""}`}
                                        onClick={() => {
                                            setSelectedLog(log)
                                            setMessage(null)
                                            setViewerError(null)
                                            setViewerOpen(true)
                                            openMessageForLog(log)
                                        }}
                                    >
                                        <td className="px-3 py-3 text-xs text-muted-foreground">{log.account_email}</td>
                                        <td className="px-3 py-3 max-w-[180px] truncate">{log.sender}</td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">{log.subject}</p>
                                            {log.preview && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{log.preview}</p>}
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted-foreground">{log.received_at ? new Date(log.received_at).toLocaleString() : "-"}</td>
                                        <td className="px-3 py-3"><span className={`rounded-sm border-2 border-foreground px-2 py-1 text-xs font-black ${log.is_read ? "bg-[#F4D6DC] text-[#190304]" : "bg-[#720002] text-white"}`}>{log.is_read ? "Dibaca" : "Baru"}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
                <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>{selectedLog?.subject || "Detail Email"}</DialogTitle>
                        <DialogDescription>{selectedLog ? `${selectedLog.sender} • ${selectedLog.account_email}` : "Memuat detail email"}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[72vh] overflow-y-auto rounded-xl border bg-white p-4 text-gray-900">
                        {viewerLoading && <p className="text-sm text-gray-500">Membuka email...</p>}
                        {viewerError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{viewerError}</p>}
                        {message && <div className="prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: cleanHtml }} />}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export function AdminDashboard(props: AdminDashboardProps) {
    return (
        <div className="min-h-screen bg-muted/20 text-foreground">
            <div className="flex min-h-screen">
                <AdminSidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <AdminTopbar loading={props.loading} onRefresh={props.onRefresh} onSignOut={props.onSignOut} />
                    <main className="flex-1 space-y-6 p-4 md:p-6">
                        <StatCards accounts={props.accounts} logs={props.logs} selectedAccountId={props.selectedAccountId} onFilterChange={props.onFilterChange} />
                        <AddAccountPanel loading={props.loading} newAccountCredential={props.newAccountCredential} newAccountKey={props.newAccountKey} onAddAccount={props.onAddAccount} onCredentialChange={props.onCredentialChange} onKeyChange={props.onKeyChange} />
                        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                            <AccountListPanel accounts={props.accounts} selectedAccountId={props.selectedAccountId} onFilterChange={props.onFilterChange} onClearFilter={props.onClearFilter} onDeleteAccount={props.onDeleteAccount} />
                            <InboxLogTable logs={props.logs} accounts={props.accounts} selectedAccountId={props.selectedAccountId} onFilterChange={props.onFilterChange} onClearFilter={props.onClearFilter} />
                        </div>
                    </main>
                    <footer className="border-t px-4 py-3 text-xs text-muted-foreground md:px-6">
                        Admin dashboard berjalan di Vercel dan terhubung ke Supabase Auth, Database, dan RLS.
                    </footer>
                </div>
            </div>
        </div>
    )
}
