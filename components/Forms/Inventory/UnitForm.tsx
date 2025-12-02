"use client";
import { createUnit } from "@/actions/units";
import TextInput from "@/components/FormInputs/TextInput";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialoUSeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCheckIcon, LayoutGrid, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type UnitFormProps = {
  name: string;
  symbol: string;
  orgId: string;
}

export function UnitForm({
  orgId,
}: {
  orgId: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnitFormProps>();
  
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);


  const saveUnit = async (data: UnitFormProps) => {
    setLoading(true);
    data.orgId = orgId;
    console.log(data);
    
    try {
      const res = await createUnit(data);
      console.log(res);
      
      if (res.status === 200) {
        toast.success("Unit created successfully!");
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
            Create Unit
          </span>
          <span className="md:sr-only">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialoUSeader>
          <DialogTitle>Create New Unit</DialogTitle>
        </DialoUSeader>
        <Card className="w-full border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Unit Info</CardTitle>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <form onSubmit={handleSubmit(saveUnit)} className="flex flex-col w-full gap-4">
              
              <TextInput
                register={register}
                errors={errors}
                label="Unit Title"
                name="name"
              />
              
              <TextInput
                register={register}
                errors={errors}
                label="Unit Symbol"
                name="symbol"
              />
              
              {loading ? (
                <Button disabled type="button">
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Creating...
                </Button>
              ) : (
                <Button type="submit">
                  <CheckCheckIcon className="mr-2 h-4 w-4" /> Create Unit
                </Button>
              )}
              
            </form>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}