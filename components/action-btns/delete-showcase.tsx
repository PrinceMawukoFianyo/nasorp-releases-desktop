"use client";
import React from "react";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { deleteShowcase } from "@/actions/showcases";
import toast from "react-hot-toast";

export default function DeleteShowcase({ id }: { id: string }) {
  async function handleDelete() {
    await deleteShowcase(id);
    toast.success("Deleted successfully");
  }
  return (
    <Button size={"icon"} variant={"outline"} onClick={() => handleDelete()}>
      <Trash2 className="w-4 h-4 text-red-500" />
    </Button>
  );
}
