// components/OfflineNotice.tsx
import { WifiOff } from "lucide-react"

export function OfflineNotice({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">{feature} needs an internet connection</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        This section syncs with the cloud and isn't available offline. Reconnect and refresh to continue.
      </p>
    </div>
  )
}