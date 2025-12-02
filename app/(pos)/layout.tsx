import { QuickPOSButton } from "./pos/components/quick-access-button";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Your existing sidebar */}
      <aside>...</aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      
      {/* Quick POS Access */}
      <QuickPOSButton />
    </div>
  )
}