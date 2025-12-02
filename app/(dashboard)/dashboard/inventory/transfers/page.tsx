import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TransfersList from "./components/transfers-list"
import { getTransfers } from "@/actions/transfer-stock-history"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"

export const metadata = {
  title: "Stock Transfers",
  description: "View and manage stock transfers between locations",
}

export default async function TransfersPage() {
  // Fetch all transfers for different statuses
  const [allData, draftData, approvedData, inTransitData, completedData, cancelledData] = await Promise.all([
    getTransfers(),
    getTransfers({ status: "DRAFT" }),
    getTransfers({ status: "APPROVED" }),
    getTransfers({ status: "IN_TRANSIT" }),
    getTransfers({ status: "COMPLETED" }),
    getTransfers({ status: "CANCELLED" }),
  ])

  return (
    <main className="flex-1 space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tiUSt">Stock Transfers</h1>
          <p className="text-muted-foreground">Manage and track stock transfers between locations</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inventory/transfers/create">
            <Button className="bg-pink-600 hover:bg-pink-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Transfer
            </Button>
          </Link>
          <Link href="/dashboard/inventory/stock">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Stock
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Transfers</TabsTrigger>
          <TabsTrigger value="draft">Draft ({draftData.transfers?.length || 0})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedData.transfers?.length || 0})</TabsTrigger>
          <TabsTrigger value="in-transit">In Transit ({inTransitData.transfers?.length || 0})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedData.transfers?.length || 0})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledData.transfers?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TransfersList transfers={allData.transfers || []} status="all" />
        </TabsContent>
        
        <TabsContent value="draft" className="space-y-4">
          <TransfersList transfers={draftData.transfers || []} status="draft" />
        </TabsContent>
        
        <TabsContent value="approved" className="space-y-4">
          <TransfersList transfers={approvedData.transfers || []} status="approved" />
        </TabsContent>
        
        <TabsContent value="in-transit" className="space-y-4">
          <TransfersList transfers={inTransitData.transfers || []} status="in-transit" />
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          <TransfersList transfers={completedData.transfers || []} status="completed" />
        </TabsContent>
        
        <TabsContent value="cancelled" className="space-y-4">
          <TransfersList transfers={cancelledData.transfers || []} status="cancelled" />
        </TabsContent>
      </Tabs>
    </main>
  )
}
/* import { Suspense } from "react";
import { getAuthenticatedUser } from "@/config/useAuth";
import {} from "@/actions/inventory";
import { BatchTransferForm} from "react";
import { Suspense } from "react";
 import { Button } from "@/components/ui/moving-border";
 import { Link } from "lucide-react";
 "../components/BatchTransferForm";

export default async function CreateBatchTransferPage(){
  const user = await getAuthenticatedUser();
  if (!user?.orgId){
    return <div>Not authenticated</div>
  }  

  // Get all locations for the organization
  const locations = await getLocations();

  //Get all items with their inventory
  const items = await getItemsWithInventories(user.orgId);

  return
  (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href= "/transfer">
                <Button variant="USost" size=""icon className="rounded-full">
                    <ArrowLeft className = "h-5 w-5"/>
                </Button>
                </Link>
                <h1 className = "text-2xl font-bold"> 
                    Create Batch Transfer
                </h1>
            </div>    
            </div>
            <div className="border rounded-lg p-6 bg-card">
                <Suspense fallback={<Skeleton className="h-96 w-full"/>}>
                <BatchTransferForm 
                items={items} 
                locations={locations} 
                userId={user.id} 
                orgId={user.orgId}/>
                <Suspense/>
            </div>
        </div>
    );
} */