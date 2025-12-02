'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription,  DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

import { toast } from 'sonner';
import { getBriefSuppliers } from '@/actions/suppliers';
import { createItemSuppliers } from '@/actions/item-supplier';

interface Supplier {
  id: string;
  name: string;
}

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  existingSupplierIds?: string[];
  onSuppliersAdded?: (suppliers: any[]) => void;
}

export default function AddSupplierModal({
  isOpen,
  onClose,
  itemId,
  existingSupplierIds = [],
  onSuppliersAdded,
}: AddSupplierModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Load suppliers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const result = await getBriefSuppliers();
      if (result) {
        setSuppliers(result);
      } else {
        toast.error('Failed to load suppliers', {
          description: 'Unable to fetch suppliers',
        });
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Error loading suppliers');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // Filter suppliers: search match + not already added
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase());
      const notAlreadyAdded = !existingSupplierIds.includes(supplier.id);
      return matchesSearch && notAlreadyAdded;
    });
  }, [suppliers, searchQuery, existingSupplierIds]);

  const handleToggleSupplier = (supplierId: string) => {
    setSelectedSuppliers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId);
      } else {
        newSet.add(supplierId);
      }
      return newSet;
    });
  };

  const handleAdd = async () => {
    if (selectedSuppliers.size === 0) {
      toast.error('No suppliers selected', {
        description: 'Please select at least one supplier',
      });
      return;
    }

    setIsLoading(true);
    try {
      const supplierIds = Array.from(selectedSuppliers);
      const result = await createItemSuppliers(itemId, supplierIds);

      if (result.success) {
        toast.success('Success', {
          description: `Added ${supplierIds.length} supplier(s) to the item`,
        });

        // Call the callback if provided
        if (onSuppliersAdded) {
          const addedSuppliers = suppliers.filter(s => supplierIds.includes(s.id));
          onSuppliersAdded(addedSuppliers);
        }

        // Reset state and close
        setSelectedSuppliers(new Set());
        setSearchQuery('');
        onClose();
      } else {
        toast.error('Error', {
          description: result.error || 'Failed to add suppliers',
        });
      }
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add suppliers',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedSuppliers(new Set());
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        < DialogHeader>
          <DialogTitle>Add Suppliers</DialogTitle>
          <DialogDescription>
            Select suppliers to associate with this item.
          </DialogDescription>
        </ DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loadingSuppliers}
          />

          {/* Suppliers List */}
          <ScrollArea className="h-64 border rounded-lg">
            <div className="p-4 space-y-3">
              {loadingSuppliers ? (
                <p className="text-sm text-muted-foreground">Loading suppliers...</p>
              ) : filteredSuppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {existingSupplierIds.length > 0 && suppliers.length > 0
                    ? 'All available suppliers have been added'
                    : 'No suppliers found'}
                </p>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-accent cursor-pointer"
                    onClick={() => handleToggleSupplier(supplier.id)}
                  >
                    <Checkbox
                      id={supplier.id}
                      checked={selectedSuppliers.has(supplier.id)}
                      onCheckedChange={() => handleToggleSupplier(supplier.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <label
                      htmlFor={supplier.id}
                      className="flex-1 cursor-pointer text-sm font-medium"
                    >
                      {supplier.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Selected Count */}
          <div className="text-sm text-muted-foreground">
            {selectedSuppliers.size} supplier(s) selected
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isLoading || selectedSuppliers.size === 0}>
            {isLoading ? 'Adding...' : 'Add Selected'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}