import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useGraph } from "@/hooks/useGraph"
import { useVaultStore } from "@/store/vaultStore"
import { getFriendlyEmailError, type MessageDetail } from "@/lib/graph"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import DOMPurify from "dompurify"

export function MessageDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const activeAccountId = useVaultStore((state) => state.activeAccountId)
    const { getMessageDetail } = useGraph()
    const [message, setMessage] = useState<MessageDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<"html" | "source">("html")

    useEffect(() => {
        if (!id) return
        let isMounted = true

        const load = async () => {
            setLoading(true)
            setError(null)
            setMessage(null)
            try {
                const msg = await getMessageDetail(id)
                if (isMounted) setMessage(msg)
            } catch (err: any) {
                if (isMounted) setError(getFriendlyEmailError(err))
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        load()

        return () => { isMounted = false }
    }, [id, activeAccountId, getMessageDetail])

    if (loading) {
        return (
            <div className="flex flex-col h-full w-full bg-white/55 backdrop-blur-xl">
                <header className="px-6 py-4 border-b border-[#720002]/10 flex items-center gap-4 h-16 shrink-0 bg-white/55 backdrop-blur-md">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="lg:hidden"><ArrowLeft className="w-5 h-5" /></Button>
                    <Skeleton className="w-1/2 max-w-[300px] h-6" />
                </header>
                <div className="p-8 space-y-6 max-w-4xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="w-48 h-4" />
                            <Skeleton className="w-32 h-3" />
                        </div>
                    </div>
                    <Skeleton className="w-full h-[60vh] rounded-xl" />
                </div>
            </div>
        )
    }

    if (error || !message) {
        return (
            <div className="flex flex-col h-full p-6 items-center justify-center text-center w-full">
                <div className="user-glass-card p-6 rounded-3xl text-[#720002] max-w-md w-full">
                    <h3 className="font-semibold mb-2">Email tidak bisa dibuka</h3>
                    <p className="text-sm opacity-90 mb-6">{error || "Email tidak ditemukan"}</p>
                    <Button variant="outline" onClick={() => navigate(-1)} className="w-full"><ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Email Masuk</Button>
                </div>
            </div>
        )
    }

    // Purify HTML
    const cleanHtml = DOMPurify.sanitize(message.bodyHtmlRaw, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target']
    })

    // Basic initials for avatar
    const initials = message.from.substring(0, 2).toUpperCase()

    return (
        <div className="flex flex-col h-full w-full z-20">
            {/* Mobile-only back header */}
            <div className="lg:hidden flex items-center sticky top-0 z-20 p-2 border-b border-[#720002]/10 bg-white/75 backdrop-blur-xl shrink-0 h-14">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0 gap-1 text-[#720002]/70 hover:text-[#720002]">
                    <ArrowLeft className="w-4 h-4" /> Kembali
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative w-full h-full bg-white/35">
                <div className="max-w-4xl mx-auto w-full">
                    {/* Header Area */}
                    <div className="px-6 py-8 md:px-10 md:py-10 border-b border-[#720002]/10 bg-white/45 backdrop-blur-xl">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-[#720002] mb-6">
                            {message.subject}
                        </h1>

                        <div className="flex items-start sm:items-center gap-4">
                            <div className="user-berry-gradient w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg shadow-[#720002]/20">
                                {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                                    <span className="truncate text-base font-bold text-[#2a0709]">
                                        {message.from}
                                    </span>
                                </div>
                                {message.toRecipients.length > 0 && (
                                    <div className="text-xs text-[#720002]/55 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-bold text-[#720002]/75">Kepada:</span>
                                        <span className="truncate">{message.toRecipients.join(", ")}</span>
                                    </div>
                                )}
                            </div>

                            {/* View Mode Toggle */}
                            <div className="flex bg-[#F4D6DC]/70 p-1 rounded-2xl shrink-0 self-start sm:self-center ml-auto ring-1 ring-[#720002]/10">
                                <Button
                                    variant={viewMode === "html" ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`h-8 rounded-xl text-xs px-3 shadow-none ${viewMode === "html" ? "bg-white text-[#720002]" : "text-[#720002]/65 hover:text-[#720002]"}`}
                                    onClick={() => setViewMode("html")}
                                >
                                    Tampilan biasa
                                </Button>
                                <Button
                                    variant={viewMode === "source" ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`h-8 rounded-xl text-xs px-3 shadow-none ${viewMode === "source" ? "bg-white text-[#720002]" : "text-[#720002]/65 hover:text-[#720002]"}`}
                                    onClick={() => setViewMode("source")}
                                >
                                    Teks asli
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Body content */}
                    <div className="px-6 py-8 md:px-10 pb-20">
                        {viewMode === "html" ? (
                            <div className="bg-white text-gray-900 rounded-3xl shadow-xl shadow-[#720002]/10 border border-[#720002]/10 overflow-hidden">
                                <div
                                    className="prose prose-sm md:prose-base max-w-none p-4 sm:p-6 sm:px-8
                                 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                                 prose-p:leading-relaxed prose-headings:font-semibold
                                 break-words"
                                    dangerouslySetInnerHTML={{ __html: cleanHtml }}
                                />
                            </div>
                        ) : (
                            <div className="bg-white/70 p-4 rounded-3xl border border-[#720002]/10 overflow-x-auto text-xs font-mono whitespace-pre-wrap break-all text-[#720002]/70">
                                {message.bodyHtmlRaw}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
