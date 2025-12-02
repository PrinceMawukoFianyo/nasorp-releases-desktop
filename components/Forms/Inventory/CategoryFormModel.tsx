"use client";
import { createBrand } from "@/actions/brands";
import { createCategory } from "@/actions/categories";
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
import { CheckCheckIcon, LayoutGrid, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type CategoryFormProps = {
  title: string;
  slug: string;
  orgId: string; 
  description: string;
  imageUrl?: string;
}

export function CategoryFormModel({
  orgId,
}: {
  orgId: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormProps>();
  
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);


  const saveCategory = async (data: CategoryFormProps) => {
    setLoading(true);
    data.slug = generateSlug(data.title) 
    data.imageUrl = "/placeholder.png"
    data.orgId = orgId;
    console.log(data);
    
    try {
      const res = await createCategory(data);
      console.log(res);
      
      if (res.status === 200) {
        toast.success("Category created successfully!");
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
            Create Category
          </span>
          <span className="md:sr-only">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
        </DialogHeader>
        <Card className="w-full border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Category Info</CardTitle>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <form onSubmit={handleSubmit(saveCategory)} className="flex flex-col w-full gap-4">
              
              <TextInput
                register={register}
                errors={errors}
                label="category Title"
                name="title"
              />
              <TextArea
                register={register}
                errors={errors}
                label="Description"
                name="description"
                isRequired = {false}
              />              
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