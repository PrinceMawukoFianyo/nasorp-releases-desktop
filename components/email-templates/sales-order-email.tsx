import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Hr,
  Button,
  Tailwind,
} from '@react-email/components';

// TypeScript interfaces for reference:
// interface SalesOrder {
//   id: string;
//   orderNumber: string;
//   date: Date;
//   customerId: string;
//   customerName?: string | null;
//   customer: {
//     id: string;
//     name: string;
//     phone: string | null;
//     email: string | null;
//     address: string | null;
//   };
//   status: "DRAFT" | "CONFIRMED" | "PROCESSING" | "PARTIALLY_SHIPPED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "CLOSED";
//   subtotal: number;
//   taxAmount: number;
//   shippingCost?: number | null;
//   discount?: number | null;
//   total: number;
//   notes?: string | null;
//   paymentTerms?: string | null;
//   expectedDeliveryDate?: Date | null;
//   createdBy: { name: string | null };
//   createdAt: Date;
// }
//
// interface LineItemData {
//   id: string;
//   quantity: number;
//   itemId: string;
//   unitPrice: Decimal | number;
//   taxRate: number;
//   taxAmount: number;
//   discount?: number | null;
//   total: number;
//   shippedQuantity: number;
//   item: {
//     id: string;
//     name: string;
//     sku: string;
//     description?: string;
//   };
// }

export type SalesOrderEmailProps = {
  salesOrder: any;
  customer: any;
  lineItems: any[];
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  shippingAddress?: string;
}

export default function SalesOrderEmail(props: SalesOrderEmailProps){
  const {
    salesOrder,
    customer,
    lineItems,
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    shippingAddress,
  } = props;

  const replySubject = `RE: Sales Order ${salesOrder.orderNumber} - Inquiry`;
  const replyBody = `Dear ${companyName},%0D%0A%0D%0AI have a question regarding Sales Order ${salesOrder.orderNumber}.%0D%0A%0D%0A[Please describe your inquiry here]%0D%0A%0D%0AThank you,%0D%0A${customer.name}`;
  const mailtoLink = `mailto:${companyEmail}?subject=${encodeURIComponent(replySubject)}&body=${replyBody}`;

  // Format date helper
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Format currency helper
  const formatCurrency = (amount: any) => {
    if (amount === null || amount === undefined) return '0.00';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Status badge color helper
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      CONFIRMED: 'bg-blue-500',
      PROCESSING: 'bg-yellow-500',
      PARTIALLY_SHIPPED: 'bg-orange-500',
      SHIPPED: 'bg-green-500',
      DELIVERED: 'bg-green-600',
      CANCELLED: 'bg-red-500',
      CLOSED: 'bg-gray-600',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Body className="bg-gray-50 font-sans py-[40px]">
          <Container className="bg-white max-w-[650px] mx-auto shadow-lg rounded-[12px] overflow-hidden">
            {/* Elegant Header with Gradient */}
            <Section className="bg-gradient-to-r from-blue-600 to-blue-700 px-[48px] py-[40px] relative">
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-500 opacity-10 rounded-full -mr-[100px] -mt-[100px]"></div>
              <Heading className="text-white text-[32px] font-bold m-0 tracking-tiUSt">
                Sales Order
              </Heading>
              <Text className="text-blue-50 text-[18px] m-0 mt-[12px] font-medium">
                Order #{salesOrder.orderNumber}
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="px-[48px] py-[40px]">
              <Text className="text-gray-800 text-[17px] leading-[26px] mb-[28px] font-medium">
                Dear {customer.name},
              </Text>

              <Text className="text-gray-600 text-[16px] leading-[26px] mb-[32px]">
                Thank you for your order! We are pleased to confirm your sales order as detailed below. 
                Your order is being processed and will be shipped according to the timeline specified.
              </Text>

              {/* Contact Us Button */}
              <Section className="text-center mb-[32px]">
                <Button
                  href={mailtoLink}
                  className="bg-blue-600 text-white px-[32px] py-[14px] rounded-[8px] font-semibold text-[16px] no-underline inline-block shadow-md hover:bg-blue-700"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '14px 32px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Contact Us
                </Button>
              </Section>

              {/* Order Details Card */}
              <Section className="mb-[36px] border border-gray-200 rounded-[10px] overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-[24px] py-[16px] border-b border-blue-200">
                  <Heading className="text-blue-800 text-[19px] font-bold m-0">
                    Order Details
                  </Heading>
                </div>
                
                <div className="px-[24px] py-[20px] bg-white">
                  <Row className="mb-[14px]">
                    <Column className="w-[45%]">
                      <Text className="text-gray-500 text-[14px] font-semibold m-0 uppercase tracking-wide">
                        Order Number
                      </Text>
                    </Column>
                    <Column className="w-[55%]">
                      <Text className="text-gray-900 text-[15px] m-0 font-medium">
                        {salesOrder.orderNumber}
                      </Text>
                    </Column>
                  </Row>

                  <Row className="mb-[14px]">
                    <Column className="w-[45%]">
                      <Text className="text-gray-500 text-[14px] font-semibold m-0 uppercase tracking-wide">
                        Order Date
                      </Text>
                    </Column>
                    <Column className="w-[55%]">
                      <Text className="text-gray-900 text-[15px] m-0 font-medium">
                        {formatDate(salesOrder.date)}
                      </Text>
                    </Column>
                  </Row>

                  <Row className="mb-[14px]">
                    <Column className="w-[45%]">
                      <Text className="text-gray-500 text-[14px] font-semibold m-0 uppercase tracking-wide">
                        Expected Delivery
                      </Text>
                    </Column>
                    <Column className="w-[55%]">
                      <Text className="text-gray-900 text-[15px] m-0 font-medium">
                        {formatDate(salesOrder.expectedDeliveryDate)}
                      </Text>
                    </Column>
                  </Row>

                  <Row>
                    <Column className="w-[45%]">
                      <Text className="text-gray-500 text-[14px] font-semibold m-0 uppercase tracking-wide">
                        Payment Terms
                      </Text>
                    </Column>
                    <Column className="w-[55%]">
                      <Text className="text-gray-900 text-[15px] m-0 font-medium">
                        {salesOrder.paymentTerms || 'N/A'}
                      </Text>
                    </Column>
                  </Row>
                </div>
              </Section>

              {/* Items Table */}
              <Section className="mb-[36px]">
                <Heading className="text-gray-800 text-[19px] font-bold mb-[20px]">
                  Items Ordered
                </Heading>

                {/* Table Header */}
                <Row className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-[8px]">
                  <Column className="w-[40%] px-[16px] py-[14px]">
                    <Text className="text-white text-[13px] font-bold m-0 uppercase tracking-wide">
                      Description
                    </Text>
                  </Column>
                  <Column className="w-[20%] px-[16px] py-[14px] text-center">
                    <Text className="text-white text-[13px] font-bold m-0 uppercase tracking-wide">
                      Qty
                    </Text>
                  </Column>
                  <Column className="w-[20%] px-[16px] py-[14px] text-right">
                    <Text className="text-white text-[13px] font-bold m-0 uppercase tracking-wide">
                      Unit Price
                    </Text>
                  </Column>
                  <Column className="w-[20%] px-[16px] py-[14px] text-right">
                    <Text className="text-white text-[13px] font-bold m-0 uppercase tracking-wide">
                      Total
                    </Text>
                  </Column>
                </Row>

                {/* Items */}
                {lineItems?.map((lineItem, index) => (
                  <Row 
                    key={lineItem.id} 
                    className={`border-l border-r border-b border-gray-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <Column className="w-[40%] px-[16px] py-[14px]">
                      <Text className="text-gray-800 text-[14px] m-0 font-medium">
                        {lineItem.item.name}
                      </Text>
                      {lineItem.item.description && (
                        <Text className="text-gray-500 text-[12px] m-0 mt-[4px]">
                          {lineItem.item.description}
                        </Text>
                      )}
                    </Column>
                    <Column className="w-[20%] px-[16px] py-[14px] text-center">
                      <Text className="text-gray-700 text-[14px] m-0">
                        {lineItem.quantity}
                      </Text>
                    </Column>
                    <Column className="w-[20%] px-[16px] py-[14px] text-right">
                      <Text className="text-gray-700 text-[14px] m-0">
                        ${formatCurrency(lineItem.unitPrice)}
                      </Text>
                    </Column>
                    <Column className="w-[20%] px-[16px] py-[14px] text-right">
                      <Text className="text-gray-800 text-[14px] m-0 font-medium">
                        ${formatCurrency(lineItem.total)}
                      </Text>
                    </Column>
                  </Row>
                ))}

                {/* Subtotal */}
                <Row className="border-l border-r border-b border-gray-200 bg-gray-50">
                  <Column className="w-[80%] px-[16px] py-[12px] text-right">
                    <Text className="text-gray-700 text-[14px] font-medium m-0">
                      Subtotal:
                    </Text>
                  </Column>
                  <Column className="w-[20%] px-[16px] py-[12px] text-right">
                    <Text className="text-gray-800 text-[14px] font-medium m-0">
                      ${formatCurrency(salesOrder.subtotal)}
                    </Text>
                  </Column>
                </Row>

                {/* Tax */}
                {salesOrder.taxAmount > 0 && (
                  <Row className="border-l border-r border-b border-gray-200 bg-gray-50">
                    <Column className="w-[80%] px-[16px] py-[12px] text-right">
                      <Text className="text-gray-700 text-[14px] font-medium m-0">
                        Tax:
                      </Text>
                    </Column>
                    <Column className="w-[20%] px-[16px] py-[12px] text-right">
                      <Text className="text-gray-800 text-[14px] font-medium m-0">
                        ${formatCurrency(salesOrder.taxAmount)}
                      </Text>
                    </Column>
                  </Row>
                )}

                {/* Shipping */}
                {salesOrder.shippingCost > 0 && (
                  <Row className="border-l border-r border-b border-gray-200 bg-gray-50">
                    <Column className="w-[80%] px-[16px] py-[12px] text-right">
                      <Text className="text-gray-700 text-[14px] font-medium m-0">
                        Shipping:
                      </Text>
                    </Column>
                    <Column className="w-[20%] px-[16px] py-[12px] text-right">
                      <Text className="text-gray-800 text-[14px] font-medium m-0">
                        ${formatCurrency(salesOrder.shippingCost)}
                      </Text>
                    </Column>
                  </Row>
                )}

                {/* Discount */}
                {salesOrder.discount > 0 && (
                  <Row className="border-l border-r border-b border-gray-200 bg-gray-50">
                    <Column className="w-[80%] px-[16px] py-[12px] text-right">
                      <Text className="text-gray-700 text-[14px] font-medium m-0">
                        Discount:
                      </Text>
                    </Column>
                    <Column className="w-[20%] px-[16px] py-[12px] text-right">
                      <Text className="text-red-600 text-[14px] font-medium m-0">
                        -${formatCurrency(salesOrder.discount)}
                      </Text>
                    </Column>
                  </Row>
                )}

                {/* Total Row */}
                <Row className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-b-[8px]">
                  <Column className="w-[80%] px-[16px] py-[16px] text-right">
                    <Text className="text-gray-800 text-[17px] font-bold m-0">
                      Total Amount:
                    </Text>
                  </Column>
                  <Column className="w-[20%] px-[16px] py-[16px] text-right">
                    <Text className="text-blue-700 text-[18px] font-bold m-0">
                      ${formatCurrency(salesOrder.total)}
                    </Text>
                  </Column>
                </Row>
              </Section>

              {/* Shipping Information Card */}
              <Section className="mb-[36px] border border-gray-200 rounded-[10px] overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-[24px] py-[16px] border-b border-blue-200">
                  <Heading className="text-blue-800 text-[19px] font-bold m-0">
                    Shipping Information
                  </Heading>
                </div>
                <div className="px-[24px] py-[20px] bg-white">
                  <Text className="text-gray-500 text-[13px] uppercase tracking-wide font-semibold mb-[8px]">
                    Ship To:
                  </Text>
                  <Text className="text-gray-800 text-[15px] leading-[22px] m-0 font-medium">
                    {customer.name}
                  </Text>
                  <Text className="text-gray-600 text-[14px] leading-[22px] m-0 mt-[4px]">
                    {shippingAddress || customer.address}
                  </Text>
                </div>
              </Section>

              {/* Order Notes (if any) */}
              {salesOrder.notes && (
                <Section className="mb-[32px] bg-gray-50 border border-gray-200 p-[24px] rounded-[10px]">
                  <Heading className="text-gray-800 text-[16px] font-bold mb-[12px] m-0">
                    Order Notes
                  </Heading>
                  <Text className="text-gray-700 text-[14px] leading-[22px] m-0">
                    {salesOrder.notes}
                  </Text>
                </Section>
              )}

              {/* What's Next */}
              <Section className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600 p-[28px] rounded-[10px] mb-[32px]">
                <Heading className="text-blue-900 text-[18px] font-bold mb-[16px] m-0">
                  What's Next?
                </Heading>
                <Text className="text-gray-700 text-[15px] leading-[24px] m-0 mb-[10px]">
                  ✓ Your order is being processed
                </Text>
                <Text className="text-gray-700 text-[15px] leading-[24px] m-0 mb-[10px]">
                  ✓ You'll receive a shipping notification with tracking details
                </Text>
                <Text className="text-gray-700 text-[15px] leading-[24px] m-0">
                  ✓ Expected delivery: {formatDate(salesOrder.expectedDeliveryDate)}
                </Text>
              </Section>

              <Text className="text-gray-600 text-[15px] leading-[26px] mb-[28px]">
                If you have any questions regarding this order, please don't hesitate to contact us at{' '}
                <span className="text-blue-600 font-medium">{companyEmail}</span> or{' '}
                <span className="text-blue-600 font-medium">{companyPhone}</span>.
              </Text>

              <Text className="text-gray-700 text-[16px] leading-[26px] mb-[32px]">
                Thank you for your business! We appreciate your trust in us.
              </Text>

              <div className="border-t border-gray-200 pt-[24px]">
                <Text className="text-gray-700 text-[15px] leading-[24px] m-0">
                  Best regards,
                </Text>
                <Text className="text-gray-900 text-[16px] leading-[24px] m-0 mt-[8px] font-bold">
                  {salesOrder.createdBy.name || 'Sales Team'}
                </Text>
                <Text className="text-blue-700 text-[15px] leading-[22px] m-0 font-semibold">
                  {companyName}
                </Text>
              </div>
            </Section>

            {/* Footer */}
            <Section className="bg-gradient-to-r from-gray-800 to-gray-900 px-[48px] py-[32px]">
              <Text className="text-gray-300 text-[13px] text-center m-0 leading-[20px]">
                <strong className="text-white">{companyName}</strong>
              </Text>
              <Text className="text-gray-400 text-[12px] text-center m-0 mt-[6px] leading-[18px]">
                {companyAddress}
              </Text>
              <Text className="text-gray-400 text-[12px] text-center m-0 mt-[6px] leading-[18px]">
                Phone: {companyPhone} | Email: {companyEmail}
              </Text>
              <Hr className="border-gray-700 my-[16px]" />
              <Text className="text-gray-500 text-[11px] text-center m-0">
                © 2025 {companyName}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

SalesOrderEmail.PreviewProps = {
  salesOrder: {
    id: "so_123",
    orderNumber: "SO-2025-001",
    date: new Date("2025-11-18"),
    customerId: "cust_456",
    status: "CONFIRMED",
    subtotal: 3200.00,
    taxAmount: 480.00,
    shippingCost: 50.00,
    discount: 100.00,
    total: 3630.00,
    notes: "Please handle with care. Fragile items.",
    paymentTerms: "50% upfront, 50% on delivery",
    expectedDeliveryDate: new Date("2025-12-05"),
    createdBy: { name: "Jane Doe" },
    createdAt: new Date("2025-11-18")
  },
  customer: {
    id: "cust_456",
    name: "Kwame Mensah",
    phone: "+233 24 567 8901",
    email: "kwame@example.com",
    address: "15 Ridge Road, Kumasi, USana"
  },
  lineItems: [
    {
      id: "li_1",
      quantity: 2,
      itemId: "item_1",
      unitPrice: 800.00,
      taxRate: 15,
      taxAmount: 240.00,
      discount: 0,
      total: 1600.00,
      shippedQuantity: 0,
      item: {
        id: "item_1",
        name: "Premium Laptop",
        sku: "LAPTOP-PRO-001",
        description: "15-inch, 16GB RAM, 512GB SSD"
      }
    },
    {
      id: "li_2",
      quantity: 3,
      itemId: "item_2",
      unitPrice: 400.00,
      taxRate: 15,
      taxAmount: 180.00,
      discount: 0,
      total: 1200.00,
      shippedQuantity: 0,
      item: {
        id: "item_2",
        name: "Wireless Mouse",
        sku: "MOUSE-WL-002",
        description: "Ergonomic design with USB receiver"
      }
    },
    {
      id: "li_3",
      quantity: 4,
      itemId: "item_3",
      unitPrice: 100.00,
      taxRate: 15,
      taxAmount: 60.00,
      discount: 0,
      total: 400.00,
      shippedQuantity: 0,
      item: {
        id: "item_3",
        name: "USB-C Cable",
        sku: "CABLE-USBC-003",
        description: "2 meter fast charging cable"
      }
    }
  ],
  companyName: "Tech Solutions Ltd.",
  companyAddress: "123 Business Street, Kumasi, USana",
  companyPhone: "+233 20 123 4567",
  companyEmail: "sales@techsolutions.com",
  shippingAddress: "15 Ridge Road\nKumasi, USana"
};