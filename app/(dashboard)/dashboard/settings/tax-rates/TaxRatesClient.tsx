"use client";

// app/dashboard/settings/tax-rates/TaxRatesClient.tsx
// Owns the dialog open/close state directly — no more broken ModalTableHeader prop mismatch.

import { useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Percent, Info } from "lucide-react";
import { toast } from "sonner";
import { createTax, deleteTax } from "@/actions/tax";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaxRate {
  id: string;
  name: string;
  rate: number;
  orgId: string;
  createdAt: Date | string;
}

interface Props {
  taxes: TaxRate[];
  orgId: string;
}

// ─── Form schema ──────────────────────────────────────────────────────────────
const taxFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  rate: z
    .number({ invalid_type_error: "Rate must be a number" })
    .min(0, "Rate cannot be negative")
    .max(100, "Rate cannot exceed 100%"),
});

type TaxFormValues = z.infer<typeof taxFormSchema>;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TaxRatesClient({ taxes: initialTaxes, orgId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false); // ← owns the dialog state
  const [taxes, setTaxes] = useState<TaxRate[]>(initialTaxes);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxFormSchema),
    defaultValues: { name: "", rate: 0 },
  });

  // ── Create ──
  async function onSubmit(values: TaxFormValues) {
    startTransition(async () => {
      const result = await createTax({
        name: values.name,
        rate: values.rate,
        orgId,
      });

      if (result.status === 200 && result.data) {
        toast.success(`Tax rate "${values.name}" created`);
        setTaxes((prev) => [result.data as TaxRate, ...prev]);
        form.reset();
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create tax rate");
      }
    });
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteTargetId) return;
    startTransition(async () => {
      const result = await deleteTax(deleteTargetId);
      if (result?.ok) {
        toast.success("Tax rate deleted");
        setTaxes((prev) => prev.filter((t) => t.id !== deleteTargetId));
        router.refresh();
      } else {
        toast.error("Failed to delete tax rate");
      }
      setDeleteTargetId(null);
    });
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax Rates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your organisation's tax rates.
          </p>
        </div>

        {/* ✅ Dialog owned here — not in a separate ModalTableHeader */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tax Rate
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Tax Rate</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5 pt-2"
              >
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. VAT, GST, Standard Rate"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rate */}
                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate (%) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            placeholder="e.g. 12.5"
                            className="pr-8"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                          <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormDescription className="flex items-start gap-1.5 text-xs">
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                        Tax rates must be <strong>manually selected</strong> when
                        creating or editing an item. They are never applied
                        automatically.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving…" : "Save Tax Rate"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notice banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Tax rates are <strong>never applied automatically</strong> to items.
          When creating or editing an item, you must explicitly choose a tax
          rate — or leave it blank for no tax.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Name</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Items Using This Rate</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Percent className="h-8 w-8 opacity-20" />
                    <p className="font-medium">No tax rates yet</p>
                    <p className="text-xs">
                      Click "Add Tax Rate" to create your first one.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              taxes.map((tax) => (
                <TableRow key={tax.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{tax.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {tax.rate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      Applied only when manually selected
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTargetId(tax.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tax Rate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this tax rate. Any items currently
              using it will lose their tax assignment, but no prices will
              change. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}