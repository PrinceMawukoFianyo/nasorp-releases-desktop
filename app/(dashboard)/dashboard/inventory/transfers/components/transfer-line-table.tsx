import { Package } from "lucide-react"

export interface TransferLineItem {
  id: string;
  itemId: string;
  transferId: string;
  quantity: number;
  notes?: string; 
  createdAt: Date;
  updatedAt: Date;
  item: {
    id: string;
    name: string;
    sku: string;
    category?: {
      id: string;
      title: string;
    } | null;
  };
}

interface TransferLineTableProps {
  lines: TransferLineItem[];
  isLoading?: boolean
}

export function TransferLineTable({ lines, isLoading }: TransferLineTableProps) {
  return (
    <div className="p-6 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Transfer Items</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Item</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Quantity</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{line.item.name}</p>
                      <p className="text-sm text-gray-600">{line.item.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="font-semibold text-gray-900">{line.quantity}</span>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{line.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lines.length === 0 && <div className="text-center py-8 text-gray-500">No items in this transfer</div>}
    </div>
  )
}