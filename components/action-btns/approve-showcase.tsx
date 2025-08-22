"use client";
import React from "react";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";
import { deleteShowcase, updateShowcaseStatus } from "@/actions/showcases";
import toast from "react-hot-toast";

export default function ApproveShowcase({ id }: { id: string }) {
  async function handleApprove() {
    const status = "APPROVED";
    await updateShowcaseStatus(id, status);
    toast.success("Approved successfully");
  }
  async function handleReject() {
    const status = "REJECTED";
    await updateShowcaseStatus(id, status);
    toast.success("Rejected successfully");
  }
  return (
    <div className="flex border p-2 rounded-md gap-4 items-center">
      <Button size={"sm"} onClick={() => handleApprove()}>
        Approve
      </Button>
      <Button size={"sm"} variant={"outline"} onClick={() => handleReject()}>
        Reject
      </Button>
    </div>
  );
}
