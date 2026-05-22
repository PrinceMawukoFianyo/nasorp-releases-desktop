"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createManualSupplierDebt } from "@/actions/supplier-payables";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export function ManualSupplierDebtDialog({ open, onOpenChange, suppliers, onSuccess }: any) {
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!supplierId || !amount) {
      toast.error("Please select supplier and enter amount");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    setLoading(true);
    const res = await createManualSupplierDebt({ supplierId, amountOwing: amt, notes });
    if (res.success) {
      toast.success("Manual supplier debt recorded");
      onSuccess();
      onOpenChange(false);
      setSupplierId("");
      setAmount("");
      setNotes("");
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Manual Supplier Debt</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount Owing (GHS) *</Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Create Manual Debt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}