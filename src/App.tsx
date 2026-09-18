import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import { AppLayout } from "./layouts/AppLayout"
import { Toaster } from "@/components/ui/sonner"
import { InboxPage } from "./pages/inbox-page"
import { MessageDetailPage } from "./pages/message-detail-page"
import { AdminPage } from "./pages/admin-page"

function RootRedirect() {
  return <Navigate to="/inbox" replace />
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="outlookreader-theme">
      <HashRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/inbox" element={<InboxPage />}>
              <Route path=":id" element={<MessageDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
