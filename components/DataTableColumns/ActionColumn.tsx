"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { deleteUser } from "@/actions/users";
import { deleteUnit } from "@/actions/units";
import { useRouter } from "next/navigation";
import { deleteBrands } from "@/actions/brands";
import { deleteCategory } from "@/actions/categories";
import { deleteItem } from "@/actions/items";

type ActionColumnProps = {
  row: any;
  model: any;
  editEndpoint: string;
  id: string | undefined;
};

export default function ActionColumn({
  row,
  model,
  editEndpoint,
  id = "",
}: ActionColumnProps) {
  const router = useRouter();
  const isActive = row.isActive;

  async function handleDelete() {
    try {
      if (model === "unit") {
        const res = await deleteUnit(id);
        if (res?.ok) {
          toast.success("Unit deleted successfully");
          router.refresh();
          window.location.reload();
          
        } else {
          toast.error("Failed to delete unit");
        }
      } else if (model === "user") {
        const res = await deleteUser(id);
        if (res?.ok) {
          toast.success("User deleted successfully");
          router.refresh();
          window.location.reload();
        } else {
          toast.error("Failed to delete user");
        }
      }
      else if (model === "brand") {
        const res = await deleteBrands(id);
        if (res?.ok) {
          toast.success("Brand deleted successfully");
          router.refresh();
          window.location.reload();
        } else {
          toast.error("Failed to delete Brand");
        }
      }else if (model === "category") {
        const res = await deleteCategory(id);
        if (res?.ok) {
          toast.success("Category deleted successfully");
          router.refresh();
          window.location.reload();
        } else {
          toast.error("Failed to delete Category");
        }
      }
      else if (model === "item") {
        const res = await deleteItem(id);
        if (res?.success) {
          toast.success("Item deleted successfully");
          router.refresh();
          window.location.reload();
        } else {
          toast.error("Failed to delete Item");
        }
      }
    } catch (error) {
      console.log(error);
      toast.error(`${model} couldn't be deleted`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Edit Button */}
      {editEndpoint && (
        <Link href={editEndpoint}>
          <Button variant="ghost" size="sm">
            <Pencil className="w-4 h-4" />
          </Button>
        </Link>
      )}

      {/* Delete Button with Alert Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this{" "}
              {model}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete}>
              Permanently Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}