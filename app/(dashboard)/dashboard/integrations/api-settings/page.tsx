import { getOrgApiKeys } from "@/actions/apiKeys"
import {ApiKeyManagement} from "@/components/dashboard/api-key-management"
import { getAuthenticatedUser } from "@/config/useAuth"
import { User } from "lucide-react"

export default async function Home() {
  const user = await getAuthenticatedUser()
  const apiKeys = await getOrgApiKeys(user.orgId)
  return (
    <main className="container mx-auto py-8 px-4">
      <ApiKeyManagement orgKeys = {apiKeys} />
    </main>
  )
}
