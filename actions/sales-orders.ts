// actions/sales-orders.ts - UPDATED
"use server"

import { db } from "@/prisma/db"
import { getAuthenticatedUser } from "@/config/useAuth"
import { revalidatePath } from "next/cache"
import { SalesOrderStatus, PaymentStatus } from "@prisma/client"
import { Resend } from 'resend'
import SalesOrderEmail, { SalesOrderEmailProps } from "@/components/email-templates/sales-order-email"

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Create a new sales order
 */
/**
 * Create a new sales order
 */
export async function createSalesOrder(data: {
  orderNumber: string
  customerId: string
  locationId: string
  orderDate: Date
  deliveryDate?: Date | null
  status: string
  paymentStatus: string
  paymentMethod?: string
  shippingCost: number
  discount: number
  notes?: string
  subtotal: number
  taxAmount: number
  lines: {
    create: Array<{
      itemId: string
      quantity: number
      unitPrice: number
      taxRate: number
      taxAmount: number
      total: number
      serialNumbers: string[]
    }>
  }
}) {
  try {
    const user = await getAuthenticatedUser()
    
    // Validate required fields
    if (!data.customerId) {
      return { success: false, error: "Customer is required" }
    }

    if (!data.locationId) {
      return { success: false, error: "Location is required" }
    }

    if (!data.lines.create || data.lines.create.length === 0) {
      return { success: false, error: "At least one line item is required" }
    }

    // Check if order number already exists
    const existingOrder = await db.salesOrder.findFirst({
      where: {
        orderNumber: data.orderNumber,
        orgId: user.orgId,
      },
    })

    if (existingOrder) {
      return { success: false, error: "Order number already exists" }
    }

    // Create the sales order - remove orderDate and deliveryDate since they don't exist
    const salesOrder = await db.salesOrder.create({
      data: {
        orderNumber: data.orderNumber,
        customerId: data.customerId,
        locationId: data.locationId,
        // Remove orderDate and deliveryDate - use createdAt instead
        status: data.status as SalesOrderStatus,
        paymentStatus: data.paymentStatus as PaymentStatus,
        paymentMethod: data.paymentMethod,
        shippingCost: data.shippingCost,
        discount: data.discount,
        notes: data.notes,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        orgId: user.orgId,
        createdById: user.id,
        lines: {
          create: data.lines.create,
        },
      },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    })

    // Revalidate relevant paths
    revalidatePath("/dashboard/sales/orders")
    revalidatePath("/dashboard/sales/orders/create")

    return { success: true, data: salesOrder }
  } catch (error: any) {
    console.error("Error creating sales order:", error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return { success: false, error: "Order number already exists" }
    }
    
    if (error.code === 'P2003') {
      return { success: false, error: "Invalid customer or location" }
    }
    
    return { success: false, error: error.message || "Failed to create sales order" }
  }
}
export async function getSalesOrders() {
  try {
    const user = await getAuthenticatedUser()
    
    const salesOrders = await db.salesOrder.findMany({
      where: {
        orgId: user.orgId,
      },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return salesOrders
  } catch (error) {
    console.error("Error fetching sales orders:", error)
    throw new Error("Failed to fetch sales orders")
  }
}

/* export async function getSalesOrderById(id: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const salesOrder = await db.salesOrder.findUnique({
      where: {
        id,
        orgId: user.orgId,
      },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    })

    return salesOrder
  } catch (error) {
    console.error("Error fetching sales order:", error)
    throw new Error("Failed to fetch sales order")
  }
} */
export async function getSalesOrderById(id: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const salesOrder = await db.salesOrder.findUnique({
      where: {
        id,
        orgId: user.orgId, // Ensure user can only access their org's orders
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
          },
        },
        createdBy: {
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
                unit: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        // 🆕 ADD THIS - Organisation info for dynamic company details
        organisation: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    if (!salesOrder) {
      return null
    }

    return salesOrder
  } catch (error) {
    console.error("Error fetching sales order:", error)
    return null
  }
}
export async function cancelSalesOrder(id: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const existingOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: true },
    })

    if (!existingOrder) {
      return { success: false, error: "Sales order not found" }
    }

    if (existingOrder.status === "CANCELLED") {
      return { success: false, error: "Order is already cancelled" }
    }

    const salesOrder = await db.salesOrder.update({
      where: { id, orgId: user.orgId },
      data: { status: SalesOrderStatus.CANCELLED },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    })

    // Revalidate all relevant paths
    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true, data: salesOrder }
  } catch (error) {
    console.error("Error cancelling sales order:", error)
    return { success: false, error: "Failed to cancel sales order" }
  }
}


export async function updateSalesOrder(id: string, data: any) {
  try {
    const user = await getAuthenticatedUser()
    
    const existingOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: true },
    })

    if (!existingOrder) {
      return { success: false, error: "Sales order not found" }
    }

    if (existingOrder.status === "CANCELLED") {
      return { success: false, error: "Cannot update a cancelled order" }
    }

    if (!data.lines?.create || data.lines.create.length === 0) {
      return { 
        success: false, 
        error: "At least one line item is required" 
      }
    }

    const salesOrder = await db.$transaction(async (tx) => {
      // Delete old line items
      await tx.salesOrderLine.deleteMany({
        where: { salesOrderId: id },
      })

      // Update the sales order with new line items
      const updated = await tx.salesOrder.update({
        where: { id, orgId: user.orgId },
        data: {
          customerId: data.customerId || null,
          locationId: data.locationId,
          status: data.status,
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentMethod,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          shippingCost: data.shippingCost,
          discount: data.discount,
          notes: data.notes,
          lines: {
            create: data.lines.create,
          },
        },
        include: {
          customer: true,
          location: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lines: {
            include: {
              item: true,
            },
          },
        },
      })

      return updated
    })

    // Revalidate all relevant paths
    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true, data: salesOrder }
  } catch (error) {
    console.error("Error updating sales order:", error)
    return { success: false, error: "Failed to update sales order" }
  }
}

export async function deleteSalesOrder(id: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const existingOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      include: { lines: true },
    })

    if (!existingOrder) {
      return { success: false, error: "Sales order not found" }
    }

    if (!["DRAFT", "CANCELLED"].includes(existingOrder.status)) {
      return { 
        success: false, 
        error: "Only DRAFT or CANCELLED orders can be deleted" 
      }
    }

    await db.$transaction(async (tx) => {
      await tx.salesOrderLine.deleteMany({
        where: { salesOrderId: id },
      })

      await tx.salesOrder.delete({
        where: { id, orgId: user.orgId },
      })
    })

    // Revalidate all sales order pages
    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true }
  } catch (error) {
    console.error("Error deleting sales order:", error)
    return { success: false, error: "Failed to delete sales order" }
  }
}

export async function updateOrderStatus(id: string, status: string) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!Object.values(SalesOrderStatus).includes(status as SalesOrderStatus)) {
      return { success: false, error: "Invalid status" }
    }

    const existingOrder = await db.salesOrder.findUnique({
      where: { id, orgId: user.orgId },
      select: { status: true },
    })

    if (!existingOrder) {
      return { success: false, error: "Sales order not found" }
    }

    if (existingOrder.status === "CANCELLED") {
      return { success: false, error: "Cannot change status of a cancelled order" }
    }

    const salesOrder = await db.salesOrder.update({
      where: { id, orgId: user.orgId },
      data: { status: status as SalesOrderStatus },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    })

    // Revalidate all relevant paths
    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true, data: salesOrder }
  } catch (error) {
    console.error("Error updating order status:", error)
    return { success: false, error: "Failed to update order status" }
  }
}

export async function updatePaymentStatus(id: string, paymentStatus: string) {
  try {
    const user = await getAuthenticatedUser()
    
    if (!Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)) {
      return { success: false, error: "Invalid payment status" }
    }

    const salesOrder = await db.salesOrder.update({
      where: { id, orgId: user.orgId },
      data: { paymentStatus: paymentStatus as PaymentStatus },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    })

    // Revalidate all relevant paths
    revalidatePath("/dashboard/sales/orders")
    revalidatePath(`/dashboard/sales/orders/${id}`)
    revalidatePath(`/dashboard/sales/orders/${id}/edit`)

    return { success: true, data: salesOrder }
  } catch (error) {
    console.error("Error updating payment status:", error)
    return { success: false, error: "Failed to update payment status" }
  }
}

export async function sendSalesOrderEmail(orderId: string, recipientEmail: string) {
  try {
    const user = await getAuthenticatedUser()
    
    const order = await db.salesOrder.findUnique({
      where: { id: orderId, orgId: user.orgId },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lines: {
          include: {
            item: true,
          },
        },
      },
    })

    if (!order) {
      return { success: false, error: "Sales order not found" }
    }

    if (!order.customer) {
      return { success: false, error: "Customer not found for this order" }
    }

    // Calculate totals
    const subtotal = order.subtotal || 0
    const taxAmount = order.taxAmount || 0
    const shippingCost = order.shippingCost || 0
    const discount = order.discount || 0
    const total = subtotal + taxAmount + shippingCost - discount

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 20px; }
          .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .line-items { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .line-items th, .line-items td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .totals { background: white; padding: 20px; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sales Order Confirmation</h1>
            <p>Order #${order.orderNumber}</p>
          </div>
          
          <div class="content">
            <div class="order-details">
              <h2>Order Details</h2>
              <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${order.status}</p>
              <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
              ${order.paymentMethod ? `<p><strong>Payment Method:</strong> ${order.paymentMethod}</p>` : ''}
            </div>

            <div class="order-details">
              <h2>Customer Information</h2>
              <p><strong>Name:</strong> ${order.customer.name}</p>
              ${order.customer.email ? `<p><strong>Email:</strong> ${order.customer.email}</p>` : ''}
              ${order.customer.phone ? `<p><strong>Phone:</strong> ${order.customer.phone}</p>` : ''}
              ${order.customer.address ? `<p><strong>Address:</strong> ${order.customer.address}</p>` : ''}
            </div>

            <div class="order-details">
              <h2>Order Items</h2>
              <table class="line-items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.lines?.map((line: any) => `
                    <tr>
                      <td>${line.item?.name || 'Unknown Item'}</td>
                      <td>${line.quantity}</td>
                      <td>GHS ${line.unitPrice.toFixed(2)}</td>
                      <td>GHS ${(line.quantity * line.unitPrice).toFixed(2)}</td>
                    </tr>
                  `).join('') || ''}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <h2>Order Summary</h2>
              <p><strong>Subtotal:</strong> GHS ${subtotal.toFixed(2)}</p>
              <p><strong>Tax:</strong> GHS ${taxAmount.toFixed(2)}</p>
              <p><strong>Shipping:</strong> GHS ${shippingCost.toFixed(2)}</p>
              ${discount > 0 ? `<p><strong>Discount:</strong> -GHS ${discount.toFixed(2)}</p>` : ''}
              <p><strong>Total:</strong> GHS ${total.toFixed(2)}</p>
            </div>

            ${order.notes ? `
            <div class="order-details">
              <h2>Notes</h2>
              <p>${order.notes}</p>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>If you have any questions, please contact us.</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Sales Orders <princefianyo8@gmail.com>',
      to: [recipientEmail],
      subject: `Sales Order Confirmation - ${order.orderNumber}`,
      html: emailHtml,
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error: 'Failed to send email' }
    }

    return { success: true, data: { emailId: data?.id } }
  } catch (error) {
    console.error('Error in sendSalesOrderEmail:', error)
    return { success: false, error: 'An error occurred while sending the email' }
  }
}

// Utility function - kept for compatibility
export async function checkItemAvailability(itemId: string, quantity: number) {
  try {
    const user = await getAuthenticatedUser()
    
    const item = await db.item.findUnique({
      where: { id: itemId, orgId: user.orgId },
      select: {
        id: true,
        name: true,
        sku: true,
      },
    })

    if (!item) {
      return { 
        available: false, 
        message: "Item not found" 
      }
    }

    return {
      available: true,
      currentStock: 0,
      requestedQuantity: quantity,
      isLowStock: false,
      message: `Item available`,
    }
  } catch (error) {
    console.error("Error checking item availability:", error)
    return { 
      available: false, 
      message: "Failed to check availability" 
    }
  }
}

// Import the email component at the top of your file

async function prepareSalesOrderEmailData(orderNumber: string) {
  const user = await getAuthenticatedUser()
  const orgId = user.orgId ?? ""

  // Fetch sales order with all necessary relations
  const salesOrder = await db.salesOrder.findUnique({
    where: { 
      orderNumber,
      orgId 
    },
    include: {
      customer: true,
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

  if (!salesOrder) {
    throw new Error("Sales order not found");
  }

  // Company info - adjust based on your actual schema
  // Option 1: If you have an Organization table with company info
  /* const org = await db.organisation.findUnique({
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

  // Calculate total properly
  const calculatedTotal = 
    salesOrder.subtotal + 
    salesOrder.taxAmount + 
    (salesOrder.shippingCost || 0) - 
    (salesOrder.discount || 0);

  // Format the data for email template
  const emailData: SalesOrderEmailProps = {
    salesOrder: {
      id: salesOrder.id,
      orderNumber: salesOrder.orderNumber,
      date: salesOrder.createdAt, // Using createdAt as order date
      customerId: salesOrder.customerId,
      customer: {
        id: salesOrder.customer?.id || '',
        name: salesOrder.customer?.name || '',
        phone: salesOrder.customer?.phone || null,
        email: salesOrder.customer?.email || null,
        address: salesOrder.customer?.address || null,
      },
      status: salesOrder.status,
      subtotal: salesOrder.subtotal,
      taxAmount: salesOrder.taxAmount,
      shippingCost: salesOrder.shippingCost || 0,
      discount: salesOrder.discount || 0,
      total: calculatedTotal,
      notes: salesOrder.notes,
      paymentTerms: salesOrder.paymentMethod || 'N/A', // Using paymentMethod as paymentTerms
      expectedDeliveryDate: null, // SalesOrder doesn't have deliveryDate field
      createdBy: {
        name: salesOrder.createdBy?.name || null,
      },
      createdAt: salesOrder.createdAt,
    },
    customer: {
      id: salesOrder.customer?.id || '',
      name: salesOrder.customer?.name || '',
      phone: salesOrder.customer?.phone || null,
      email: salesOrder.customer?.email || null,
      address: salesOrder.customer?.address || null,
    },
    lineItems: salesOrder.lines.map((line: any) => ({
      id: line.id,
      quantity: line.quantity,
      itemId: line.itemId,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate || 0,
      taxAmount: line.taxAmount || 0,
      discount: line.discount || 0,
      total: line.total,
      shippedQuantity: 0, 
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
    shippingAddress: salesOrder.customer?.address || companyInfo.address,
  };

  return emailData;
}

// Send SO to customer (main function)
export async function sendSOToCustomer(
  orderNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser()
    const orgId = user.orgId ?? ""

    // Prepare email data
    const emailData = await prepareSalesOrderEmailData(orderNumber);

    // Validate customer email
    if (!emailData.customer.email) {
      throw new Error("Customer email address is not available");
    }

    // Send email to customer
    const res = await resend.emails.send({
      from: "Business Inventory <noreply@kidstarschristianacademy.com>",
      to: emailData.customer.email??  "",
      subject: `Sales Order Confirmation ${emailData.salesOrder.orderNumber}`,
      react: SalesOrderEmail(emailData),
    });

    // Update SO status to CONFIRMED
    await db.salesOrder.update({
      where: { 
        orderNumber,
        orgId 
      },
      data: {
        status: SalesOrderStatus.CONFIRMED,
      },
    });

    revalidatePath("/dashboard/sales/sales-orders");
    revalidatePath(`/dashboard/sales/sales-orders/${emailData.salesOrder.id}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error sending SO to customer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }

}