import { useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import {
    AccountListPanel,
    AddAccountPanel,
    AdminLoginCard,
    AdminMissingConfig,
    AdminShell,
    InboxLogTable,
    LatestLogsPreview,
    SettingsPanel,
    StatCards,
} from "@/components/admin/admin-dashboard"
import {
    addAdminManagedAccount,
    adminSignIn,
    adminSignOut,
    deleteAdminAccount,
    getAdminSession,
    isCurrentUserAdmin,
    isSupabaseConfigured,
    loadAdminAccounts,
    loadAdminInboxLogs,
    loadVaultEnabledSetting,
    updateVaultEnabledSetting,
    type InboxLogRow,
    type SupabaseAccountRow,
} from "@/lib/supabase"
import { toast } from "sonner"

export function AdminPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [accounts, setAccounts] = useState<SupabaseAccountRow[]>([])
    const [logs, setLogs] = useState<InboxLogRow[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState("")
    const [vaultEnabled, setVaultEnabled] = useState(false)
    const [newAccountCredential, setNewAccountCredential] = useState("")
    const [newAccountKey, setNewAccountKey] = useState("")

    const loadAdminData = async (accountId = selectedAccountId) => {
        setLoading(true)
        try {
            const [accountRows, logRows, vaultSetting] = await Promise.all([
                loadAdminAccounts(),
                loadAdminInboxLogs(accountId || undefined),
                loadVaultEnabledSetting(),
            ])
            setAccounts(accountRows)
            setLogs(logRows)
            setVaultEnabled(vaultSetting)
        } catch (error: any) {
            toast.error(error.message || "Gagal memuat data admin")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const init = async () => {
            if (!isSupabaseConfigured) {
                setLoading(false)
                return
            }

            try {
                const session = await getAdminSession()
                if (!session) {
                    setLoading(false)
                    return
                }

                const allowed = await isCurrentUserAdmin()
                setIsAdmin(allowed)
                if (allowed) await loadAdminData("")
            } catch (error: any) {
                toast.error(error.message || "Gagal membuka admin")
            } finally {
                setLoading(false)
            }
        }

        init()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        try {
            await adminSignIn(email, password)
            const allowed = await isCurrentUserAdmin()
            if (!allowed) {
                await adminSignOut()
                setIsAdmin(false)
                toast.error("Email ini belum diberi akses admin")
                return
            }

            setIsAdmin(true)
            toast.success("Login admin berhasil")
            await loadAdminData("")
        } catch (error: any) {
            toast.error(error.message || "Login admin gagal")
        } finally {
            setLoading(false)
        }
    }

    const handleSignOut = async () => {
        await adminSignOut()
        setIsAdmin(false)
        setAccounts([])
        setLogs([])
        setPassword("")
    }

    const handleDeleteAccount = async (accountId: string) => {
        if (!confirm("Hapus akun ini dari database? Log email akun ini juga akan terhapus.")) return

        setLoading(true)
        try {
            await deleteAdminAccount(accountId)
            toast.success("Akun berhasil dihapus")
            await loadAdminData(selectedAccountId === accountId ? "" : selectedAccountId)
            if (selectedAccountId === accountId) setSelectedAccountId("")
        } catch (error: any) {
            toast.error(error.message || "Gagal menghapus akun")
        } finally {
            setLoading(false)
        }
    }

    const handleFilterChange = async (accountId: string) => {
        setSelectedAccountId(accountId)
        await loadAdminData(accountId)
    }

    const handleClearFilter = async () => {
        setSelectedAccountId("")
        await loadAdminData("")
    }

    const handleToggleVault = async () => {
        const nextValue = !vaultEnabled
        setLoading(true)
        try {
            await updateVaultEnabledSetting(nextValue)
            setVaultEnabled(nextValue)
            toast.success(nextValue ? "Menu Kelola Akun ditampilkan" : "Menu Kelola Akun disembunyikan")
        } catch (error: any) {
            toast.error(error.message || "Gagal mengubah pengaturan")
        } finally {
            setLoading(false)
        }
    }

    const handleAddAdminAccount = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        try {
            const importedCount = await addAdminManagedAccount(newAccountCredential, newAccountKey)
            setNewAccountCredential("")
            setNewAccountKey("")
            toast.success(`Akun berhasil ditambahkan. ${importedCount} email terbaru dicatat.`)
            await loadAdminData(selectedAccountId)
        } catch (error: any) {
            toast.error(error.message || "Gagal menambahkan akun")
        } finally {
            setLoading(false)
        }
    }

    if (!isSupabaseConfigured) return <AdminMissingConfig />

    if (!isAdmin) {
        return (
            <AdminLoginCard
                email={email}
                password={password}
                loading={loading}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={handleLogin}
            />
        )
    }

    return (
        <AdminShell
            loading={loading}
            onRefresh={() => loadAdminData()}
            onSignOut={handleSignOut}
        >
            <Routes>
                <Route
                    index
                    element={
                        <>
                            <StatCards
                                accounts={accounts}
                                logs={logs}
                                selectedAccountId={selectedAccountId}
                                onFilterChange={handleFilterChange}
                            />
                            <LatestLogsPreview logs={logs} />
                        </>
                    }
                />
                <Route
                    path="add-account"
                    element={
                        <AddAccountPanel
                            loading={loading}
                            newAccountCredential={newAccountCredential}
                            newAccountKey={newAccountKey}
                            onAddAccount={handleAddAdminAccount}
                            onCredentialChange={setNewAccountCredential}
                            onKeyChange={setNewAccountKey}
                        />
                    }
                />
                <Route
                    path="accounts"
                    element={
                        <AccountListPanel
                            accounts={accounts}
                            selectedAccountId={selectedAccountId}
                            onFilterChange={handleFilterChange}
                            onClearFilter={handleClearFilter}
                            onDeleteAccount={handleDeleteAccount}
                        />
                    }
                />
                <Route
                    path="logs"
                    element={
                        <InboxLogTable
                            logs={logs}
                            accounts={accounts}
                            selectedAccountId={selectedAccountId}
                            onFilterChange={handleFilterChange}
                            onClearFilter={handleClearFilter}
                        />
                    }
                />
                <Route
                    path="settings"
                    element={
                        <SettingsPanel
                            vaultEnabled={vaultEnabled}
                            loading={loading}
                            onToggleVault={handleToggleVault}
                        />
                    }
                />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
        </AdminShell>
    )
}
