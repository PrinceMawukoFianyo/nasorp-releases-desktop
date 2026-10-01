// lib/with-offline-fallback.ts
export async function withOfflineFallback<T>(
  fetcher: () => Promise<T>,
  fallback: T
): Promise<{ data: T; offline: boolean }> {
  try {
    const data = await fetcher()
    return { data, offline: false }
  } catch (error: any) {
    const isConnectionIssue =
      error?.code === "P1001" || error?.name?.includes("PrismaClient") || error?.message?.includes("reach database")
    if (isConnectionIssue) {
      console.warn("⚠️ Offline fallback triggered:", error?.message)
      return { data: fallback, offline: true }
    }
    throw error // genuine bug — let it surface normally, don't hide real errors
  }
}