import { useState } from "react"
import { useVaultStore } from "@/store/vaultStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Shield, Lock, Unlock, KeyRound, Plus, Trash2, EyeOff, Server, Copy, Download } from "lucide-react"
import { toast } from "sonner"

async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // Fallback for non-secure contexts or unfocused windows
    }

    try {
        const textarea = document.createElement("textarea")
        textarea.value = text
        textarea.style.position = "fixed"
        textarea.style.left = "-9999px"
        textarea.style.top = "-9999px"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const successful = document.execCommand("copy")
        document.body.removeChild(textarea)
        return successful
    } catch {
        return false
    }
}

export function VaultManager() {
    const { hasVault, hasHydrated, isLocked, accounts, initializeVault, unlockVault, lockVault, addAccount, removeAccount, getExportString } = useVaultStore()
    const [passphrase, setPassphrase] = useState("")
    const [isEphemeral, setIsEphemeral] = useState(false)
    const [newCreds, setNewCreds] = useState("")
    const [loading, setLoading] = useState(false)

    const handleCopySingle = async (accountId: string) => {
        const str = getExportString(accountId)
        if (str) {
            const ok = await copyToClipboard(str)
            if (ok) {
                toast.success("Data akun berhasil disalin")
            } else {
                toast.error("Gagal menyalin data akun")
            }
        } else {
            toast.error("Data akun belum bisa dibuka. Masukkan kunci keamanan terlebih dahulu.")
        }
    }

    const handleExportAll = async () => {
        const str = getExportString()
        if (str) {
            const ok = await copyToClipboard(str)
            if (ok) {
                toast.success(`${accounts.length} data akun berhasil disalin`)
            } else {
                toast.error("Gagal menyalin data akun")
            }
        } else {
            toast.error("Belum ada akun yang bisa diekspor")
        }
    }

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const success = await unlockVault(passphrase)
        setLoading(false)
        if (success) {
            toast.success("Akun berhasil dibuka")
        } else {
            toast.error("Kunci keamanan salah atau data akun rusak")
        }
    }

    const handleInit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passphrase.length < 4) {
            return toast.error("Kunci keamanan minimal 4 karakter")
        }
        await initializeVault(passphrase, isEphemeral)
        toast.success(isEphemeral
            ? "Mode sementara aktif. Data akan hilang saat tab ditutup."
            : "Kunci keamanan dibuat. Sekarang Anda bisa menambahkan akun.")
    }

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCreds.includes(":") && !newCreds.includes("|")) return toast.error("Format data akun belum benar")
        if (isLocked) return toast.error("Buka kunci keamanan terlebih dahulu")

        setLoading(true)
        try {
            await addAccount(newCreds, passphrase)
            setNewCreds("")
            toast.success("Akun berhasil disimpan dengan aman")
        } catch (err: any) {
            toast.error(err.message || "Gagal menambahkan akun")
        } finally {
            setLoading(false)
        }
    }

    if (!hasHydrated) {
        return (
            <div className="flex min-h-[70vh] w-full items-center justify-center text-sm text-[#720002]/60">
                Menyiapkan akun...
            </div>
        )
    }

    if (isLocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] w-full p-4 md:p-8 relative z-10 overflow-hidden">
                {/* Decorative background effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F4D6DC] rounded-full blur-[100px] -z-10 opacity-70 pointer-events-none" />
                <div className="absolute top-1/3 right-1/4 w-[340px] h-[340px] bg-[#DB8291]/30 rounded-full blur-[90px] -z-10 pointer-events-none" />

                <Card className="user-glass-card w-full max-w-sm rounded-[2rem] overflow-hidden relative">
                    {/* Inner subtle glow line */}
                    <div className="absolute inset-x-0 top-0 h-2 user-berry-gradient" />

                    <CardHeader className="text-center space-y-3 pb-6 pt-8">
                        <div className="w-16 h-16 bg-[#F4D6DC] rounded-3xl flex items-center justify-center mx-auto mb-4 ring-1 ring-[#720002]/10 shadow-inner">
                            {hasVault ? <Shield className="w-8 h-8 text-[#720002] drop-shadow-sm" /> : <KeyRound className="w-8 h-8 text-[#720002] drop-shadow-sm" />}
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight text-[#720002]">{hasVault ? "Buka Kunci Akun" : "Buat Kunci Keamanan"}</CardTitle>
                        <CardDescription className="text-sm font-medium text-[#720002]/65 leading-relaxed px-2">
                            {hasVault
                                ? "Masukkan kunci keamanan untuk membuka daftar akun email Anda."
                                : "Buat kunci yang mudah Anda ingat. Kunci ini dipakai untuk mengamankan akun di browser ini."}
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={hasVault ? handleUnlock : handleInit} className="px-6 pb-6 space-y-6">
                        <div className="relative group">
                            <Input
                                type="password"
                                placeholder="Kunci keamanan"
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                className="bg-white/70 border-[#720002]/15 h-14 text-center text-lg tracking-widest placeholder:tracking-normal placeholder:text-[#720002]/35 shadow-inner transition-all focus:bg-white focus:ring-2 focus:ring-[#DB8291]/30 rounded-2xl text-[#720002]"
                                autoFocus
                            />
                            {/* subtle focus ring effect underneath standard input */}
                            <div className="absolute inset-0 -z-10 bg-primary/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>

                        {!hasVault && (
                            <div className="flex items-center space-x-2 px-1">
                                <input
                                    type="checkbox"
                                    id="ephemeral"
                                    className="w-4 h-4 rounded border-border/50 bg-background/50 text-primary focus:ring-primary/50"
                                    checked={isEphemeral}
                                    onChange={(e) => setIsEphemeral(e.target.checked)}
                                />
                                <label
                                    htmlFor="ephemeral"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                                >
                                    Mode sementara, hapus data saat tab ditutup
                                </label>
                            </div>
                        )}
                        <Button
                            type="submit"
                            className="user-berry-gradient w-full h-12 text-base font-bold rounded-2xl text-white shadow-lg shadow-[#720002]/20 hover:opacity-95 transition-all duration-300"
                            disabled={loading || !passphrase}
                        >
                            {loading ? "Memproses..." : (hasVault ? <><Unlock className="w-5 h-5 mr-2" /> Buka Akun</> : <><KeyRound className="w-5 h-5 mr-2" /> Buat Kunci</>)}
                        </Button>
                    </form>

                    {/* Trust Indicators */}
                    <div className="px-6 pb-8">
                        <TooltipProvider delayDuration={100}>
                            <div className="flex items-center justify-center gap-4 text-muted-foreground/70">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5 text-[11px] font-medium hover:text-primary transition-colors cursor-help">
                                            <EyeOff className="w-3.5 h-3.5" />
                                            <span>Tersimpan lokal</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[250px] text-center">
                                        <p>Data akun dienkripsi dan disimpan di browser ini. Tidak dikirim ke database aplikasi.</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5 text-[11px] font-medium hover:text-primary transition-colors cursor-help">
                                            <Server className="w-3.5 h-3.5" />
                                            <span>Microsoft API</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[260px] text-center">
                                        <p>Email dibaca melalui Microsoft Graph API menggunakan token akun yang Anda simpan.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="w-full h-full p-4 md:p-8 overflow-y-auto relative z-10 hidden-scrollbar">
            <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-[#F4D6DC]/70 to-transparent -z-10 pointer-events-none" />

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-[#720002]">Kelola Akun</h1>
                            <p className="text-sm text-[#720002]/60 mt-0.5">Tambah, pilih, salin, atau hapus akun email dari browser ini.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {accounts.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleExportAll} className="rounded-full h-9 px-3">
                                <Download className="w-4 h-4 mr-2" />
                                Salin Semua
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => {
                            lockVault()
                            setPassphrase("")
                            toast.info("Akun dikunci")
                        }} className="shrink-0 rounded-full h-9 px-4 hidden sm:flex">
                            <Lock className="w-4 h-4 mr-2" />
                            Kunci
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => {
                            lockVault()
                            setPassphrase("")
                            toast.info("Akun dikunci")
                        }} className="shrink-0 sm:hidden rounded-full">
                            <Lock className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    {/* Active Accounts List */}
                    <div className="md:col-span-3 space-y-4 order-2 md:order-1">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold tracking-tight">Akun Tersimpan</h2>
                            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {accounts.length} akun
                            </span>
                        </div>

                        <Card className="border-border/50 shadow-sm overflow-hidden bg-background/60 backdrop-blur-sm">
                            {accounts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                    <KeyRound className="w-10 h-10 opacity-20 mb-3" />
                                    <p className="text-sm font-medium">Belum ada akun</p>
                                    <p className="text-xs opacity-70 mt-1">Tempel data akun di kolom sebelah kanan untuk mulai membaca email.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {accounts.map(acc => (
                                        <div key={acc.id} className="flex items-center justify-between p-4 flex-wrap gap-4 hover:bg-accent/30 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                                                    {acc.email.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-sm truncate">{acc.email}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button variant="ghost" size="sm" onClick={() => handleCopySingle(acc.id)} title="Salin data akun" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => removeAccount(acc.id)} title="Hapus akun" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Add Account Sidebar */}
                    <div className="md:col-span-2 space-y-4 order-1 md:order-2">
                        <h2 className="text-lg font-semibold tracking-tight">Tambah Akun</h2>
                        <Card className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
                            <form onSubmit={handleAddAccount}>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground font-medium mb-2">
                                            Tempel data akun di bawah ini. Format didukung: <code className="text-[10px] bg-muted px-1 py-0.5 rounded text-foreground">email:password:refresh_token:client_id</code>
                                        </p>
                                        <Input
                                            type="text"
                                            placeholder="Tempel data akun di sini..."
                                            value={newCreds}
                                            onChange={(e) => setNewCreds(e.target.value)}
                                            disabled={loading}
                                            className="font-mono text-xs h-10 bg-background/50 border-border/50 shadow-inner"
                                        />
                                    </div>
                                    <Button type="submit" disabled={loading || !newCreds} className="w-full h-10 rounded-xl shadow-sm">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Simpan Akun
                                    </Button>
                                </CardContent>
                            </form>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
