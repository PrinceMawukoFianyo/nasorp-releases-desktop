"use client";
import { createTax } from "@/actions/tax";
import { createUnit } from "@/actions/units";
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
import { CheckCheckIcon, LayoutGrid, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type TaxFormProps = {
  name: string;
  rate: number;
  orgId: string;
}

export function TaxRateForm({
  orgId,
}: {
  orgId: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaxFormProps>();
  
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);


  const saveTax = async (data: TaxFormProps) => {
    setLoading(true);
    data.rate = Number(data.rate)
    data.orgId = orgId;
    console.log(data);
    
    try {
      const res = await createTax(data);
      console.log(res);
      
      if (res.status === 200) {
        toast.success("Tax created successfully!");
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
            Create Tax Rate
          </span>
          <span className="md:sr-only">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create New Tax</DialogTitle>
        </DialogHeader>
        <Card className="w-full border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Tax Info</CardTitle>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <form onSubmit={handleSubmit(saveTax)} className="flex flex-col w-full gap-4">
              
              <TextInput
                register={register}
                errors={errors}
                label="Tax Name"
                name="name"
              />
              
              <TextInput
                register={register}
                errors={errors}
                label="Rate (%)"
                name="rate"
                unit="%"
                toolTipText="This Value must be in percentage"
              />
              
              {loading ? (
                <Button disabled type="button">
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Creating...
                </Button>
              ) : (
                <Button type="submit">
                  <CheckCheckIcon className="mr-2 h-4 w-4" /> Create Tax 
                </Button>
              )}
              
            </form>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}