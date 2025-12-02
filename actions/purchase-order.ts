// FILE: actions/purchase-order.ts
"use server"

import { db } from "@/prisma/db"
import { Decimal } from "@prisma/client/runtime/library"
import { PurchaseOrderStatus } from "@prisma/client"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import PurchaseOrderEmail, { PurchaseOrderEmailProps } from "@/components/email-templates/purchase-order-email"

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

interface CreatePOLineItem {
  itemId: string
  quantity: number
  unitPrice: string | number
  taxRate: number
}

interface CreatePOData {
  poNumber: string
  supplierId: string
  deliveryLocationId: string
  orderDate: string
  expectedDeliveryDate?: string | null
  deliveryAddress?: string
  notes?: string | null
  shippingCost?: string | number
  taxPercentage?: number
  paymentTerms?: string | null
  status?: PurchaseOrderStatus
  lineItems: CreatePOLineItem[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to generate unique PO number
async function generateUniquePONumber(orgId: string): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  
  // Get the last PO number for this month in this organization
  const lastPO = await db.purchaseOrder.findFirst({
    where: {
      orgId,
      poNumber: {
        startsWith: `PO-${year}${month}`
      }
    },
    orderBy: {
      poNumber: 'desc'
    }
  })

  let sequence = 1
  if (lastPO) {
    const parts = lastPO.poNumber.split('-')
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2])
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }
  }

  return `PO-${year}${month}-${String(sequence).padStart(4, '0')}`
}

// Check if PO number already exists in the organization
async function isPONumberUnique(
  poNumber: string, 
  orgId: string, 
  excludeId?: string
): Promise<boolean> {
  const existing = await db.purchaseOrder.findFirst({
    where: {
      poNumber,
      orgId,
      ...(excludeId ? { id: { not: excludeId } } : {})
    }
  })
  return !existing
}

// ============================================================================
// MAIN CRUD OPERATIONS
// ============================================================================

export async function createPurchaseOrder(data: CreatePOData) {
  try {
    // Get authenticated user and org info
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""
    const userId = user.id ?? ""

    // Generate unique PO number if not provided or if it already exists
    let poNumber = data.poNumber?.trim()
    
    if (!poNumber) {
      poNumber = await generateUniquePONumber(orgId)
    } else {
      // Check if the provided PO number is unique
      const isUnique = await isPONumberUnique(poNumber, orgId)
      if (!isUnique) {
        return {
          success: false,
          error: `PO Number "${poNumber}" already exists. Please use a different number or leave it blank to auto-generate.`
        }
      }
    }

    // Calculate totals
    const subtotal = data.lineItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === "string" 
        ? parseFloat(item.unitPrice) 
        : item.unitPrice
      return sum + (item.quantity * unitPrice)
    }, 0)

    const taxAmount = data.lineItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === "string" 
        ? parseFloat(item.unitPrice) 
        : item.unitPrice
      const itemSubtotal = item.quantity * unitPrice
      return sum + (itemSubtotal * (item.taxRate / 100))
    }, 0)

    const shippingCost = data.shippingCost 
      ? parseFloat(data.shippingCost.toString()) 
      : 0

    // Create purchase order
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        deliveryLocationId: data.deliveryLocationId,
        date: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate 
          ? new Date(data.expectedDeliveryDate) 
          : null,
        address: data.deliveryAddress || "",
        notes: data.notes || null,
        paymentTerms: data.paymentTerms || null,
        subtotal: subtotal,
        taxAmount: taxAmount,
        shippingCost: shippingCost,
        status: data.status || "DRAFT",
        orgId: orgId,
        createdById: userId,
        lines: {
          create: data.lineItems.map((item) => {
            const unitPrice = typeof item.unitPrice === "string" 
              ? parseFloat(item.unitPrice) 
              : item.unitPrice
            const itemSubtotal = item.quantity * unitPrice
            const itemTax = itemSubtotal * (item.taxRate / 100)
            const total = itemSubtotal + itemTax

            return {
              item: {
                connect: {
                  id: item.itemId
                }
              },
              quantity: item.quantity,
              unitPrice: unitPrice,
              taxRate: item.taxRate,
              taxAmount: itemTax,
              total: total,
              receivedQuantity: 0
            }
          })
        }
      },
      include: {
        lines: {
          include: {
            item: true
          }
        },
        supplier: true,
        deliveryLocation: true,
        createdBy: {
          select: {
            name: true,
          }
        }
      }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    
    return {
      success: true,
      data: purchaseOrder
    }
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create purchase order"
    }
  }
}

export async function updatePurchaseOrder(
  id: string,
  data: CreatePOData
) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    // Check if PO number is unique (excluding current PO)
    const poNumber = data.poNumber?.trim()
    if (!poNumber) {
      return {
        success: false,
        error: "PO Number is required"
      }
    }

    const isUnique = await isPONumberUnique(poNumber, orgId, id)
    if (!isUnique) {
      return {
        success: false,
        error: `PO Number "${poNumber}" already exists. Please use a different number.`
      }
    }

    // Calculate totals
    const subtotal = data.lineItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === "string" 
        ? parseFloat(item.unitPrice) 
        : item.unitPrice
      return sum + (item.quantity * unitPrice)
    }, 0)

    const taxAmount = data.lineItems.reduce((sum, item) => {
      const unitPrice = typeof item.unitPrice === "string" 
        ? parseFloat(item.unitPrice) 
        : item.unitPrice
      const itemSubtotal = item.quantity * unitPrice
      return sum + (itemSubtotal * (item.taxRate / 100))
    }, 0)

    const shippingCost = data.shippingCost 
      ? parseFloat(data.shippingCost.toString()) 
      : 0

    // Delete existing lines
    await db.purchaseOrderLine.deleteMany({
      where: { purchaseOrderId: id }
    })

    // Update purchase order with new data
    const purchaseOrder = await db.purchaseOrder.update({
      where: { 
        id,
        orgId // Ensure user can only update their org's PO
      },
      data: {
        poNumber,
        supplierId: data.supplierId,
        deliveryLocationId: data.deliveryLocationId,
        date: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate 
          ? new Date(data.expectedDeliveryDate) 
          : null,
        address: data.deliveryAddress || "",
        notes: data.notes || null,
        paymentTerms: data.paymentTerms || null,
        subtotal: subtotal,
        taxAmount: taxAmount,
        shippingCost: shippingCost,
        lines: {
          create: data.lineItems.map((item) => {
            const unitPrice = typeof item.unitPrice === "string" 
              ? parseFloat(item.unitPrice) 
              : item.unitPrice
            const itemSubtotal = item.quantity * unitPrice
            const itemTax = itemSubtotal * (item.taxRate / 100)
            const total = itemSubtotal + itemTax

            return {
              item: {
                connect: {
                  id: item.itemId
                }
              },
              quantity: item.quantity,
              unitPrice: unitPrice,
              taxRate: item.taxRate,
              taxAmount: itemTax,
              total: total,
              receivedQuantity: 0
            }
          })
        }
      },
      include: {
        lines: {
          include: {
            item: true
          }
        },
        supplier: true,
        deliveryLocation: true,
        createdBy: {
          select: {
            name: true,
          }
        }
      }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)
    
    return {
      success: true,
      data: purchaseOrder
    }
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update purchase order"
    }
  }
}

export async function deletePurchaseOrder(id: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    await db.purchaseOrder.delete({
      where: { 
        id,
        orgId // Ensure user can only delete their org's PO
      }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    
    return {
      success: true
    }
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete purchase order"
    }
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

export async function getPurchaseOrders(supplierFilter?: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const whereClause: any = {
      orgId,
    }

    if (supplierFilter) {
      whereClause.supplierId = supplierFilter
    }

    const purchaseOrders = await db.purchaseOrder.findMany({
      where: whereClause,
      include: {
        supplier: true,
        deliveryLocation: true,
        lines: {
          include: {
            item: true
          }
        },
        createdBy: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match expected format
    return purchaseOrders.map(po => ({
      ...po,
      orderDate: po.date,
      supplier: po.supplier,
    }))
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return []
  }
}

export async function getPurchaseOrderById(id: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const purchaseOrder = await db.purchaseOrder.findUnique({
      where: { 
        id,
        orgId // Ensure user can only access their org's PO
      },
      include: {
        supplier: true,
        deliveryLocation: true,
        lines: {
          include: {
            item: true
          }
        },
        createdBy: {
          select: {
            name: true,
          }
        }
      }
    })

    if (!purchaseOrder) return null

    // Transform the data to match expected format
    return {
      ...purchaseOrder,
      orderDate: purchaseOrder.date,
      supplier: purchaseOrder.supplier,
    }
  } catch (error) {
    console.error("Error fetching purchase order:", error)
    return null
  }
}


export async function getSuppliers() {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const suppliers = await db.supplier.findMany({
      where: { 
        orgId
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        contactPerson: true,
        phone: true,
        address: true,
      }
    })

    return suppliers
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return []
  }
}

export async function getLocations() {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const locations = await db.location.findMany({
      where: { 
        orgId
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        address: true,
      }
    })

    return locations
  } catch (error) {
    console.error("Error fetching locations:", error)
    return []
  }
}

export async function getItems() {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const items = await db.item.findMany({
      where: { 
        orgId,
        isActive: true // Only get active items
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        sku: true,
        description: true,
        // Remove unitCost if it doesn't exist in your schema
        // unitCost: true,
      }
    })

    return items
  } catch (error) {
    console.error("Error fetching items:", error)
    return []
  }
}


export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus
) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const purchaseOrder = await db.purchaseOrder.update({
      where: { 
        id,
        orgId
      },
      data: {
        status
      },
      include: {
        supplier: true,
        deliveryLocation: true,
        lines: {
          include: {
            item: true
          }
        }
      }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)

    return {
      success: true,
      data: purchaseOrder
    }
  } catch (error) {
    console.error("Error updating purchase order status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status"
    }
  }
}

export async function receivePOGoods(id: string, receivedDate?: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const purchaseOrder = await db.purchaseOrder.update({
      where: { 
        id,
        orgId
      },
      data: {
        status: "RECEIVED",
        // Add receivedDate if your schema has this field
        // receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      },
      include: {
        supplier: true,
        deliveryLocation: true,
        lines: {
          include: {
            item: true
          }
        }
      }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)

    return {
      success: true,
      data: purchaseOrder
    }
  } catch (error) {
    console.error("Error receiving goods:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to receive goods"
    }
  }
}

export async function cancelPurchaseOrder(id: string, reason?: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    // First fetch the current PO to get existing notes
    const currentPO = await db.purchaseOrder.findUnique({
      where: { id, orgId },
      select: { notes: true }
    })

    // Build the notes string
    let updatedNotes = reason ? `CANCELLED: ${reason}` : 'CANCELLED'
    if (currentPO?.notes) {
      updatedNotes += `\n\nOriginal notes: ${currentPO.notes}`
    }

    // Update the purchase order
    const purchaseOrder = await db.purchaseOrder.update({
      where: { 
        id,
        orgId
      },
      data: {
        status: "CANCELLED",
        notes: updatedNotes
      },
      include: {
        supplier: true,
        deliveryLocation: true,
        lines: {
          include: {
            item: true
          }
        }
      }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)

    return {
      success: true,
      data: purchaseOrder
    }
  } catch (error) {
    console.error("Error cancelling purchase order:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel purchase order"
    }
  }
}



// Alias for getPurchaseOrderById
export async function getPurchaseOrder(id: string) {
  return getPurchaseOrderById(id)
}

export async function generatePONumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const datePrefix = `${year}${month}${day}`
  
  const startOfDay = new Date(today.setHours(0, 0, 0, 0))
  const endOfDay = new Date(today.setHours(23, 59, 59, 999))
  
  try {
    const todayPOCount = await db.purchaseOrder.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })
    
    const sequence = String(todayPOCount + 1).padStart(4, '0')
    const poNumber = `PO-${datePrefix}-${sequence}`
    
    const existingPO = await db.purchaseOrder.findUnique({
      where: { poNumber }
    })
    
    if (existingPO) {
      return generatePONumber()
    }
    
    return poNumber
  } catch (error) {
    console.error("Error generating PO number:", error)
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `PO-${datePrefix}-${random}${timestamp.toString().slice(-4)}`
  }
}

export async function getPurchaseOrderLineItems(purchaseOrderId: string) {
  try {
    const lineItems = await db.purchaseOrderLine.findMany({
      where: {
        purchaseOrderId: purchaseOrderId
      },
      include: {
        item: true // Include item details
      }
    });
    
    return lineItems;
  } catch (error) {
    console.error("Error fetching line items:", error);
    throw error;
  }
}
/* export async function sendPOToSupplier(data: PurchaseOrderEmailProps): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await resend.emails.send({
      from: "Business Inventory <noreply@kidstarschristianacademy.com>",
      to: data.purchaseOrder.supplier.email || "email@example.com",
      subject: `Purchase Order ${data.purchaseOrder.poNumber}`,
      react: PurchaseOrderEmail(data), // Changed from PurchaseOrderEmail({props})
    });
    
    return { 
      success: true,
    };
  } catch (error) {
    console.error("Error sending PO to supplier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
} */

/* export async function sendPurchaseOrderEmail(
  data: PurchaseOrderEmailProps, 
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update purchase order status
    await db.purchaseOrder.update({
      where: {
        poNumber: data.purchaseOrder.poNumber,
      },
      data: {
        status: PurchaseOrderStatus.SUBMITTED, // Changed from { set: "SUBMITTED" }
      },
    });

    // Send email
    const res = await resend.emails.send({
      from: "Business Inventory <noreply@kidstarschristianacademy.com>",
      to: email,
      subject: `New Purchase Order from ${data.companyName}`,
      react: PurchaseOrderEmail(data), // Changed from PurchaseOrderEmail(props)
    });

    revalidatePath("/dashboard/purchases/purchase-orders");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error sending purchase order email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
} */


  // Helper function to prepare email data
async function preparePurchaseOrderEmailData(poNumber: string) {
  const user = await getAuthenticatedUser()
  const orgId = user.orgId ?? ""

  // Fetch purchase order with all necessary relations
  const purchaseOrder = await db.purchaseOrder.findUnique({
    where: { 
      poNumber,
      orgId 
    },
    include: {
      supplier: true,
      deliveryLocation: true,
      lines: {
        include: {
          item: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!purchaseOrder) {
    throw new Error("Purchase order not found");
  }

  // Company info - adjust based on your actual schema
  // Option 1: If you have an Organization table with company info
  /* const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      address: true,
      phone: true,
      email: true,
    }
  }); */

  // Option 2: Hardcoded company info (use this for now)
  const companyInfo = {
    name: "Business Inventory",
    address: "Sunyani, USana",
    phone: "+233 5698734",
    email: "info@businessinventory.com",
  };

  // Format the data for email template
  const emailData: PurchaseOrderEmailProps = {
    purchaseOrder: {
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      date: purchaseOrder.date,
      supplierId: purchaseOrder.supplierId,
      supplier: {
        id: purchaseOrder.supplier.id,
        name: purchaseOrder.supplier.name,
        phone: purchaseOrder.supplier.phone,
        email: purchaseOrder.supplier.email,
        address: purchaseOrder.supplier.address,
      },
      status: purchaseOrder.status,
      subtotal: purchaseOrder.subtotal,
      taxAmount: purchaseOrder.taxAmount,
      shippingCost: purchaseOrder.shippingCost || 0,
      discount: purchaseOrder.discount || 0,
      total: purchaseOrder.subtotal + purchaseOrder.taxAmount + (purchaseOrder.shippingCost || 0),
      notes: purchaseOrder.notes,
      paymentTerms: purchaseOrder.paymentTerms,
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate,
      createdBy: {
        name: purchaseOrder.createdBy?.name || null,
      },
      createdAt: purchaseOrder.createdAt,
    },
    lineItems: purchaseOrder.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      itemId: line.itemId,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      taxAmount: line.taxAmount,
      discount: line.discount || 0,
      total: line.total,
      receivedQuantity: line.receivedQuantity,
      item: {
        id: line.item.id,
        name: line.item.name,
        sku: line.item.sku,
        description: line.item.description || "",
      },
    })),
    companyName: companyInfo.name,
    companyAddress: companyInfo.address,
    companyPhone: companyInfo.phone,
    companyEmail: companyInfo.email,
    deliveryAddress: purchaseOrder.address || companyInfo.address,
  };

  return emailData;
}

// Send PO to supplier (main function)
export async function sendPOToSupplier(
  poNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    // Prepare email data
    const emailData = await preparePurchaseOrderEmailData(poNumber);

    // Validate supplier email
    if (!emailData.purchaseOrder.supplier.email) {
      throw new Error("Supplier email address is not available");
    }

    // Send email to supplier
    const res = await resend.emails.send({
      from: "Business Inventory <noreply@kidstarschristianacademy.com>",
      to: emailData.purchaseOrder.supplier.email,
      subject: `Purchase Order ${emailData.purchaseOrder.poNumber}`,
      react: PurchaseOrderEmail(emailData),
    });

    // Update PO status to SUBMITTED
    await db.purchaseOrder.update({
      where: { 
        poNumber,
        orgId 
      },
      data: {
        status: PurchaseOrderStatus.SUBMITTED,
      },
    });

    revalidatePath("/dashboard/purchases/purchase-orders");
    revalidatePath(`/dashboard/purchases/purchase-orders/${emailData.purchaseOrder.id}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error sending PO to supplier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// Alternative: Send PO email to custom recipient
export async function sendPOEmailToRecipient(
  poNumber: string,
  recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Prepare email data
    const emailData = await preparePurchaseOrderEmailData(poNumber);

    // Send email
    const res = await resend.emails.send({
      from: "Business Inventory <noreply@kidstarschristianacademy.com>",
      to: recipientEmail,
      subject: `Purchase Order ${emailData.purchaseOrder.poNumber} from ${emailData.companyName}`,
      react: PurchaseOrderEmail(emailData),
    });

    revalidatePath("/dashboard/purchases/purchase-orders");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error sending purchase order email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// Add this function to purchase-order.ts to mark POs as completed
export async function completePurchaseOrder(id: string) {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    const purchaseOrder = await db.purchaseOrder.update({
      where: { 
        id,
        orgId
      },
      data: {
        status: PurchaseOrderStatus.COMPLETED
      },
      include: {
        supplier: true,
        lines: {
          include: {
            item: true
          }
        }
      }
    })

    revalidatePath("/dashboard/purchases/purchase-orders")
    revalidatePath(`/dashboard/purchases/purchase-orders/${id}`)

    return {
      success: true,
      data: purchaseOrder
    }
  } catch (error) {
    console.error("Error completing purchase order:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete purchase order"
    }
  }
}