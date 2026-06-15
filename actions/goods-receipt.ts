'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/prisma/db'
import { PurchaseOrderStatus, GoodsReceiptStatus } from '@prisma/client'
import { 
  CreateGoodsReceiptRequest, 
  UpdateGoodsReceiptStatusRequest, 
  GoodsReceiptFilter,
  UpdateGoodsReceiptRequest 
} from '@/types/goods-receipt'
import { getAuthenticatedUser } from '@/config/useAuth'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generateUniqueReceiptNumber(orgId: string): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  
  const lastReceipt = await db.goodsReceipt.findFirst({
    where: {
      orgId,
      receiptNumber: {
        startsWith: `GR-${year}${month}`
      }
    },
    orderBy: {
      receiptNumber: 'desc'
    }
  })

  let sequence = 1
  if (lastReceipt) {
    const parts = lastReceipt.receiptNumber.split('-')
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2])
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }
  }

  return `GR-${year}${month}-${String(sequence).padStart(4, '0')}`
}

// ============================================================================
// CREATE GOODS RECEIPT
// ============================================================================

export async function createGoodsReceipt(data: CreateGoodsReceiptRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const userId = user.id
    const orgId = user.orgId
    
    if (!orgId) {
      return { success: false, error: "No organization found" }
    }

    // Validate location exists
    const locationExists = await db.location.findUnique({
      where: { id: data.locationId, orgId }
    })

    if (!locationExists) {
      return { success: false, error: "Invalid delivery location" }
    }

    // Generate unique receipt number
    const receiptNumber = await generateUniqueReceiptNumber(orgId)

    // Fetch the purchase order with lines
    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId, orgId },
      include: {
        lines: {
          include: {
            item: true
          }
        },
        supplier: true
      }
    })

    if (!purchaseOrder) {
      return { success: false, error: "Purchase order not found" }
    }

    // Create goods receipt with lines in a transaction
    const goodsReceipt = await db.$transaction(async (tx) => {
      // Create a map of purchaseOrderLineId to item details
      const lineItemMap = new Map(
        purchaseOrder.lines.map(line => [line.id, line])
      )

      // Validate that received quantities don't exceed ordered quantities
      for (const item of data.items) {
        const poLine = lineItemMap.get(item.purchaseOrderLineId)
        if (!poLine) {
          throw new Error(`Purchase order line ${item.purchaseOrderLineId} not found`)
        }
        
        const totalReceived = (poLine.receivedQuantity || 0) + item.receivedQuantity
        if (totalReceived > poLine.quantity) {
          throw new Error(
            `Received quantity ${item.receivedQuantity} exceeds remaining quantity. ` +
            `Already received: ${poLine.receivedQuantity || 0}, Ordered: ${poLine.quantity}`
          )
        }
      }

      // Calculate total from received items
      const total = data.items.reduce((sum, item) => {
        const poLine = lineItemMap.get(item.purchaseOrderLineId)
        if (!poLine) return sum
        return sum + (item.receivedQuantity * Number(poLine.unitPrice))
      }, 0)

      // Create the goods receipt
      const receipt = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: data.purchaseOrderId,
          locationId: data.locationId,
          receivedDate: new Date(),
          receivedById: userId,
          status: GoodsReceiptStatus.COMPLETED,
          notes: data.notes || "",
          total,
          orgId,
          lines: {
            create: data.items.map((item) => {
              const poLine = lineItemMap.get(item.purchaseOrderLineId)
              if (!poLine) {
                throw new Error(`Purchase order line ${item.purchaseOrderLineId} not found`)
              }

              return {
                purchaseOrderLineId: item.purchaseOrderLineId,
                itemId: poLine.itemId,
                receivedQuantity: item.receivedQuantity,
                notes: item.notes || "",
                serialNumbers: [],
              }
            }),
          },
        },
        include: {
          lines: {
            include: {
              item: true,
              purchaseOrderLine: true
            }
          },
          purchaseOrder: {
            include: {
              supplier: true
            }
          }
        },
      })

      // Update inventory for each received item
      for (const item of data.items) {
        const poLine = lineItemMap.get(item.purchaseOrderLineId)
        if (!poLine) continue

        const existingInventory = await tx.inventory.findUnique({
          where: {
            itemId_locationId: {
              itemId: poLine.itemId,
              locationId: data.locationId,
            },
          },
        })

        if (existingInventory) {
          await tx.inventory.update({
            where: {
              itemId_locationId: {
                itemId: poLine.itemId,
                locationId: data.locationId,
              },
            },
            data: {
              quantity: {
                increment: item.receivedQuantity,
              },
            },
          })
        } else {
          await tx.inventory.create({
            data: {
              itemId: poLine.itemId,
              locationId: data.locationId,
              quantity: item.receivedQuantity,
              reservedQuantity: 0,
              orgId,
            },
          })
        }
      }

      // Update purchase order lines with received quantities
      for (const item of data.items) {
        await tx.purchaseOrderLine.update({
          where: { id: item.purchaseOrderLineId },
          data: {
            receivedQuantity: {
              increment: item.receivedQuantity,
            },
          },
        })
      }

      // Get updated PO lines to calculate new status
      const updatedPOLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: data.purchaseOrderId }
      })

      const totalOrderedQuantity = updatedPOLines.reduce((sum, line) => sum + line.quantity, 0)
      const totalReceivedQuantity = updatedPOLines.reduce((sum, line) => sum + (line.receivedQuantity || 0), 0)

      console.log('PO Status Calculation:', {
        poId: data.purchaseOrderId,
        currentStatus: purchaseOrder.status,
        totalOrdered: totalOrderedQuantity,
        totalReceived: totalReceivedQuantity,
        lines: updatedPOLines.map(line => ({
          lineId: line.id,
          ordered: line.quantity,
          received: line.receivedQuantity,
          fullyReceived: (line.receivedQuantity || 0) >= line.quantity
        }))
      })

      // Determine new PO status
      let newStatus: PurchaseOrderStatus
      if (totalReceivedQuantity >= totalOrderedQuantity && totalReceivedQuantity > 0) {
        newStatus = PurchaseOrderStatus.RECEIVED
      } else if (totalReceivedQuantity > 0) {
        newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED
      } else {
        newStatus = PurchaseOrderStatus.SUBMITTED
      }

      // ── Create / update supplier payable ──────────────────────────────────
      const poTotal =
        Number(purchaseOrder.subtotal     ?? 0) +
        Number(purchaseOrder.taxAmount    ?? 0) +
        Number(purchaseOrder.shippingCost ?? 0) -
        Number(purchaseOrder.discount     ?? 0)
      const paidSoFar    = Number((purchaseOrder as any).amountPaid ?? 0)
      const amountOwing  = Math.max(0, poTotal - paidSoFar)
      const paymentStatus = amountOwing <= 0.01 ? "PAID" : paidSoFar > 0 ? "PARTIAL" : "UNPAID"

      await tx.purchaseOrder.update({
        where: { id: data.purchaseOrderId },
        data: {
          status:        newStatus,
          amountOwing:   amountOwing,
          paymentStatus: paymentStatus,
          updatedAt:     new Date(),
        } as any,
      })

      console.log('PO Status & Payable Updated:', {
        poId: data.purchaseOrderId,
        oldStatus: purchaseOrder.status,
        newStatus,
        totalOrdered: totalOrderedQuantity,
        totalReceived: totalReceivedQuantity,
        poTotal,
        paidSoFar,
        amountOwing,
        paymentStatus,
      })

      return receipt
    })

    // Revalidate all relevant paths
    revalidatePath('/dashboard/purchases/goods-receipt')
    revalidatePath(`/dashboard/purchases/goods-receipt/${goodsReceipt.id}`)
    revalidatePath(`/dashboard/purchases/purchase-orders/${data.purchaseOrderId}`)
    revalidatePath('/dashboard/purchases/purchase-orders')
    revalidatePath('/dashboard/purchases/payables')
    revalidatePath('/dashboard/purchases/overview')   // ✅ Added
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        goodsReceiptId: goodsReceipt.id,
        receiptNumber:  goodsReceipt.receiptNumber,
        poNumber:       purchaseOrder.poNumber,
        newStatus:      (goodsReceipt.purchaseOrder as any).status,
      },
    }
  } catch (error) {
    console.error('Error creating goods receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create goods receipt',
    }
  }
}

// ============================================================================
// UPDATE GOODS RECEIPT
// ============================================================================

export async function updateGoodsReceipt(id: string, data: UpdateGoodsReceiptRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const existingReceipt = await db.goodsReceipt.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: true }
    })

    if (!existingReceipt) {
      return { success: false, error: "Goods receipt not found" }
    }

    const updateData: any = {
      notes: data.notes,
    }

    if (data.locationId !== undefined) {
      updateData.locationId = data.locationId
    }

    if (data.status) {
      updateData.status = data.status as GoodsReceiptStatus
    }

    const updatedReceipt = await db.goodsReceipt.update({
      where: { id, orgId: user.orgId },
      data: updateData,
      include: {
        lines: {
          include: {
            item: true,
            purchaseOrderLine: true
          }
        },
        purchaseOrder: {
          include: {
            supplier: true
          }
        },
        location: true,
        receivedBy: true
      }
    })

    revalidatePath('/dashboard/purchases/goods-receipt')
    revalidatePath(`/dashboard/purchases/goods-receipt/${id}`)

    return {
      success: true,
      data: updatedReceipt,
    }
  } catch (error) {
    console.error('Error updating goods receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update goods receipt',
    }
  }
}

// ============================================================================
// DELETE GOODS RECEIPT
// ============================================================================

export async function deleteGoodsReceipt(id: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const receipt = await db.goodsReceipt.findUnique({
      where: { id, orgId: user.orgId },
      include: { 
        lines: true,
        purchaseOrder: true
      }
    })

    if (!receipt) {
      return { success: false, error: "Goods receipt not found" }
    }

    await db.$transaction(async (tx) => {
      // Reverse inventory for all lines
      for (const line of receipt.lines) {
        const existingInventory = await tx.inventory.findUnique({
          where: {
            itemId_locationId: {
              itemId: line.itemId,
              locationId: receipt.locationId,
            },
          },
        })

        if (existingInventory) {
          const newQuantity = existingInventory.quantity - line.receivedQuantity
          
          if (newQuantity < 0) {
            throw new Error(
              `Cannot delete receipt: Would result in negative inventory for item ${line.itemId}`
            )
          }

          await tx.inventory.update({
            where: {
              itemId_locationId: {
                itemId: line.itemId,
                locationId: receipt.locationId,
              },
            },
            data: {
              quantity: newQuantity,
            },
          })
        }

        // Decrease received quantity on PO line
        await tx.purchaseOrderLine.update({
          where: { id: line.purchaseOrderLineId },
          data: {
            receivedQuantity: {
              decrement: line.receivedQuantity,
            },
          },
        })
      }

      // Recalculate PO status after deletion
      const updatedPOLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: receipt.purchaseOrderId }
      })

      let allFullyReceived = true
      let anyPartiallyReceived = false
      let anyReceived = false

      for (const line of updatedPOLines) {
        const received = line.receivedQuantity || 0
        const ordered = line.quantity

        if (received > 0) anyReceived = true
        if (received < ordered) allFullyReceived = false
        if (received > 0 && received < ordered) anyPartiallyReceived = true
      }

      let newStatus: PurchaseOrderStatus

      if (allFullyReceived && anyReceived) {
        newStatus = PurchaseOrderStatus.RECEIVED
      } else if (anyPartiallyReceived || anyReceived) {
        newStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED
      } else {
        newStatus = receipt.purchaseOrder.status === PurchaseOrderStatus.RECEIVED ||
                    receipt.purchaseOrder.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
          ? PurchaseOrderStatus.SUBMITTED
          : receipt.purchaseOrder.status
      }

      await tx.purchaseOrder.update({
        where: { id: receipt.purchaseOrderId },
        data: { 
          status: newStatus,
          updatedAt: new Date()
        },
      })

      // Delete the goods receipt
      await tx.goodsReceipt.delete({
        where: { id }
      })

      console.log('GR Deleted, PO Status Updated:', {
        poId: receipt.purchaseOrderId,
        newStatus,
        allFullyReceived,
        anyPartiallyReceived,
        anyReceived
      })
    })

    revalidatePath('/dashboard/purchases/goods-receipt')
    revalidatePath(`/dashboard/purchases/purchase-orders/${receipt.purchaseOrderId}`)
    revalidatePath('/dashboard/purchases/purchase-orders')
    revalidatePath('/dashboard/purchases/payables')
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: { message: 'Goods receipt deleted successfully' },
    }
  } catch (error) {
    console.error('Error deleting goods receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete goods receipt',
    }
  }
}

// ============================================================================
// GET GOODS RECEIPTS
// ============================================================================

export async function getGoodsReceipts(filters?: GoodsReceiptFilter) {
  try {
    const user = await getAuthenticatedUser()
    if (!user || !user.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    const where: any = {
      orgId: user.orgId,
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.search) {
      where.OR = [
        { receiptNumber: { contains: filters.search, mode: 'insensitive' } },
        { purchaseOrder: { poNumber: { contains: filters.search, mode: 'insensitive' } } },
        { purchaseOrder: { supplier: { name: { contains: filters.search, mode: 'insensitive' } } } },
      ]
    }

    const goodsReceipts = await db.goodsReceipt.findMany({
      where,
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                description: true,
              },
            },
            purchaseOrderLine: {
              select: {
                quantity: true,
                unitPrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        receivedDate: 'desc',
      },
    })

    return {
      success: true,
      data: goodsReceipts,
    }
  } catch (error) {
    console.error('Error fetching goods receipts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch goods receipts',
    }
  }
}

// ============================================================================
// GET SINGLE GOODS RECEIPT
// ============================================================================

export async function getGoodsReceipt(id: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user || !user.orgId) {
      return { success: false, error: "Not authenticated" }
    }

    const goodsReceipt = await db.goodsReceipt.findUnique({
      where: { id, orgId: user.orgId },
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            supplier: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            purchaseOrderLine: {
              select: {
                quantity: true,
                unitPrice: true,
              },
            },
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                description: true,
              },
            },
          },
        },
      },
    })

    if (!goodsReceipt) {
      return { success: false, error: "Goods receipt not found" }
    }

    return {
      success: true,
      data: goodsReceipt,
    }
  } catch (error) {
    console.error('Error fetching goods receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch goods receipt',
    }
  }
}

// ============================================================================
// UPDATE STATUS
// ============================================================================

export async function updateGoodsReceiptStatus(data: UpdateGoodsReceiptStatusRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const updateData: {
      status?: GoodsReceiptStatus
      notes?: string
    } = {
      notes: data.notes,
    }

    if (data.status) {
      updateData.status = data.status as GoodsReceiptStatus
    }

    const goodsReceipt = await db.goodsReceipt.update({
      where: { id: data.id, orgId: user.orgId },
      data: updateData,
    })

    revalidatePath('/dashboard/purchases/goods-receipt')
    revalidatePath(`/dashboard/purchases/goods-receipt/${data.id}`)

    return {
      success: true,
      data: goodsReceipt,
    }
  } catch (error) {
    console.error('Error updating goods receipt status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update goods receipt status',
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function handleExportGoodsReceipt(id: string, format: 'pdf' | 'excel') {
  try {
    const receiptResult = await getGoodsReceipt(id)
    if (!receiptResult.success) {
      return receiptResult
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      success: true,
      data: { 
        message: `Goods receipt exported as ${format}`,
        downloadUrl: `/api/export/goods-receipts/${id}?format=${format}`,
        receipt: receiptResult.data
      },
    }
  } catch (error) {
    console.error('Error exporting goods receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export goods receipt',
    }
  }
}

export async function handleSendEmail(id: string, email?: string) {
  try {
    const receiptResult = await getGoodsReceipt(id)
    if (!receiptResult.success) {
      return receiptResult
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      success: true,
      data: { 
        message: `Goods receipt sent to ${email || 'default email'}`,
        receipt: receiptResult.data
      },
    }
  } catch (error) {
    console.error('Error sending goods receipt email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}