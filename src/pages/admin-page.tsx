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
    loadAdminAccessKey,
    loadAdminInboxLogs,
    updateAdminAccessKey,
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
    const [newAccountCredential, setNewAccountCredential] = useState("")
    const [currentAccessKey, setCurrentAccessKey] = useState("")
    const [nextAccessKey, setNextAccessKey] = useState("")
    const [hasAccessKey, setHasAccessKey] = useState(false)

    const loadAdminData = async (accountId = selectedAccountId) => {
        setLoading(true)
        try {
            const [accountRows, logRows, accessKey] = await Promise.all([
                loadAdminAccounts(),
                loadAdminInboxLogs(accountId || undefined),
                loadAdminAccessKey(),
            ])
            setAccounts(accountRows)
            setLogs(logRows)
            setHasAccessKey(Boolean(accessKey))
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

    const handleAddAdminAccount = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        try {
            const importedCount = await addAdminManagedAccount(newAccountCredential)
            setNewAccountCredential("")
            toast.success(`Akun berhasil ditambahkan. ${importedCount} email terbaru dicatat.`)
            await loadAdminData(selectedAccountId)
        } catch (error: any) {
            toast.error(error.message || "Gagal menambahkan akun")
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateAccessKey = async (event: React.FormEvent) => {
        event.preventDefault()
        setLoading(true)
        try {
            await updateAdminAccessKey(currentAccessKey, nextAccessKey)
            setCurrentAccessKey("")
            setNextAccessKey("")
            setHasAccessKey(true)
            toast.success("Kunci akses bersama berhasil diperbarui")
        } catch (error: any) {
            toast.error(error.message || "Gagal memperbarui kunci akses")
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
                            onAddAccount={handleAddAdminAccount}
                            onCredentialChange={setNewAccountCredential}
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
                            loading={loading}
                            hasAccessKey={hasAccessKey}
                            currentAccessKey={currentAccessKey}
                            nextAccessKey={nextAccessKey}
                            onCurrentAccessKeyChange={setCurrentAccessKey}
                            onNextAccessKeyChange={setNextAccessKey}
                            onUpdateAccessKey={handleUpdateAccessKey}
                        />
                    }
                />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
        </AdminShell>
    )
}
