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
                <Button variant="ghost" size=""icon className="rounded-full">
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