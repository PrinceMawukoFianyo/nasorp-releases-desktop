"use client";
import { createBrand } from "@/actions/brands";
import { createCategory } from "@/actions/categories";
import { createItem } from "@/actions/items";
import { createUnit } from "@/actions/units";
import TextArea from "@/components/FormInputs/TextAreaInput";
import TextInput from "@/components/FormInputs/TextInput";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateSlug } from "@/lib/generateSlug";
import { ItemCreateProps } from "@/types/item";
import { CheckCheckIcon, LayoutGrid, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";



export function ItemFormModel({
  orgId,
}: {
  orgId: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemCreateProps>();
  
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);


  const saveUnit = async (data: ItemCreateProps) => {
    setLoading(true);
    
    data.sellingPrice = Number(data.sellingPrice);
    data.costPrice = Number(data.costPrice);
    data.thumbnail = "https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqN5a4owpbHBYgvTZ8SDtkMErGQOR6d42fKLCoP";
    data.orgId = orgId;
    console.log(data);
    
    try {
      const res = await createItem(data);
      console.log(res);
      
      if (res.success) {
        toast.success("item created successfully!");
        window.location.reload();
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "Something went wrong");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Create Item
          </span>
          <span className="md:sr-only">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
        </DialogHeader>
        <Card className="w-full border-0 shadow-none">
          <CardFooter className="flex flex-col gap-4">
            <form onSubmit={handleSubmit(saveUnit)} className="flex flex-col w-full gap-4">
              
              <TextInput
                register={register}
                errors={errors}
                label="Item Name"
                name="name"
              />
              <TextInput
                register={register}
                errors={errors}
                label="Item SKU"
                name="sku"
              />
                
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                register={register}
                errors={errors}
                label="Selling Price"
                name="sellingPrice"
              />
              <TextInput
                register={register}
                errors={errors}
                label="Cost Price"
                name="costPrice"
              />  
              </div>  

              {loading ? (
                <Button disabled type="button">
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Creating...
                </Button>
              ) : (
                <Button type="submit">
                  <CheckCheckIcon className="mr-2 h-4 w-4" /> Create Category
                </Button>
              )}
              
            </form>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}