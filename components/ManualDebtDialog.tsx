"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createManualDebt } from "@/actions/manual-debt";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export function ManualDebtDialog({ open, onOpenChange, customers, onSuccess }: any) {
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!customerId || !amount) {
      toast.error("Please select customer and enter amount");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    setLoading(true);
    const res = await createManualDebt({ customerId, amountOwing: amt, notes });
    if (res.success) {
      toast.success("Manual debt recorded");
      onSuccess();
      onOpenChange(false);
      setCustomerId("");
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
        <DialogHeader><DialogTitle>Record Manual Debt</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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