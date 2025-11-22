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
// interface PurchaseOrder {
//   id: string;
//   poNumber: string;
//   date: Date;
//   supplierId: string;
//   supplierName?: string | null;
//   supplier: {
//     id: string;
//     name: string;
//     phone: string | null;
//     email: string | null;
//     address: string | null;
//   };
//   status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED" | "CLOSED";
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
//   receivedQuantity: number;
//   item: {
//     id: string;
//     name: string;
//     sku: string;
//     description?: string;
//   };
// }

export type PurchaseOrderEmailProps = {
  purchaseOrder: any;
  lineItems: any[];
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  deliveryAddress?: string;
}

export default function PurchaseOrderEmail(props: PurchaseOrderEmailProps){
  const {
    purchaseOrder,
    lineItems,
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    deliveryAddress,
  } = props;

  const replySubject = `RE: Purchase Order ${purchaseOrder.poNumber} - Confirmation`;
  const replyBody = `Dear ${purchaseOrder.createdBy.name || 'Sir/Madam'},%0D%0A%0D%0AI am writing to confirm receipt of Purchase Order ${purchaseOrder.poNumber}.%0D%0A%0D%0AEstimated Delivery Date: [Please fill in]%0D%0A%0D%0AThank you,%0D%0A${purchaseOrder.supplier.name}`;
  const mailtoLink = `mailto:${companyEmail}?subject=${encodeURIComponent(replySubject)}&body=${replyBody}`;

  // Format date helper
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-GH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Format currency helper
  const formatCurrency = (amount: any) => {
    if (amount === null || amount === undefined) return '0.00';
    return Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Status badge color helper
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      SUBMITTED: 'bg-rose-500',
      APPROVED: 'bg-green-500',
      PARTIALLY_RECEIVED: 'bg-yellow-500',
      RECEIVED: 'bg-green-600',
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
            <Section className="bg-gradient-to-r from-red-600 to-red-700 px-[48px] py-[40px] relative">
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-red-500 opacity-10 rounded-full -mr-[100px] -mt-[100px]"></div>
              <Heading className="text-white text-[32px] font-bold m-0 tracking-tight">
                Purchase Order
              </Heading>
              <Text className="text-red-50 text-[18px] m-0 mt-[12px] font-medium">
                Order #{purchaseOrder.poNumber}
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="px-[48px] py-[40px]">
              <Text className="text-gray-800 text-[17px] leading-[26px] mb-[28px] font-medium">
                Dear {purchaseOrder.supplier.name},
              </Text>

              <Text className="text-gray-600 text-[16px] leading-[26px] mb-[32px]">
                We are pleased to submit this Purchase Order for the items listed below. 
                Please confirm receipt of this order and provide an estimated delivery date.
              </Text>

              {/* Confirm Order Button */}
              <Section className="text-center mb-[32px]">
                <Button
                  href={mailtoLink}
                  className="bg-red-600 text-white px-[32px] py-[14px] rounded-[8px] font-semibold text-[16px] no-underline inline-block shadow-md hover:bg-red-700"
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    padding: '14px 32px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Confirm Order
                </Button>
              </Section>

              {/* Order Details Card */}
              <Section className="mb-[36px] border border-gray-200 rounded-[10px] overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-red-100 px-[24px] py-[16px] border-b border-red-200">
                  <Heading className="text-red-800 text-[19px] font-bold m-0">
                    Order Details
                  </Heading>
                </div>
                
                <div className="px-[24px] py-[20px] bg-white">
                  <Row className="mb-[14px]">
                    <Column className="w-[45%]">
                      <Text className="text-gray-500 text-[14px] font-semibold m-0 uppercase tracking-wide">
                        PO Number
                      </Text>
                    </Column>
                    <Column className="w-[55%]">
                      <Text className="text-gray-900 text-[15px] m-0 font-medium">
                        {purchaseOrder.poNumber}
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
                        {formatDate(purchaseOrder.date)}
                      </Text>
                    </Column>
                  </Row>

                  <Row className="mb-[14px]">
                    <Column className="w-[45%]">
                      <Text className="text-gray-500 text-[14px] font-semibold m-0 uppercase tracking-wide">
                        Required Delivery
                      </Text>
                    </Column>
                    <Column className="w-[55%]">
                      <Text className="text-gray-900 text-[15px] m-0 font-medium">
                        {formatDate(purchaseOrder.expectedDeliveryDate)}
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
                        {purchaseOrder.paymentTerms || 'N/A'}
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
                <Row className="bg-gradient-to-r from-red-600 to-red-700 rounded-t-[8px]">
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

                {/* Total Row */}
                <Row className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-b-[8px]">
                  <Column className="w-[80%] px-[16px] py-[16px] text-right">
                    <Text className="text-gray-800 text-[17px] font-bold m-0">
                      Total Amount:
                    </Text>
                  </Column>
                  <Column className="w-[20%] px-[16px] py-[16px] text-right">
                    <Text className="text-red-700 text-[18px] font-bold m-0">
                      ${formatCurrency(purchaseOrder.total)}
                    </Text>
                  </Column>
                </Row>
              </Section>

              {/* Delivery Information Card */}
              <Section className="mb-[36px] border border-gray-200 rounded-[10px] overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-red-100 px-[24px] py-[16px] border-b border-red-200">
                  <Heading className="text-red-800 text-[19px] font-bold m-0">
                    Delivery Information
                  </Heading>
                </div>
                <div className="px-[24px] py-[20px] bg-white">
                  <Text className="text-gray-500 text-[13px] uppercase tracking-wide font-semibold mb-[8px]">
                    Ship To:
                  </Text>
                  <Text className="text-gray-800 text-[15px] leading-[22px] m-0 font-medium">
                    {companyName}
                  </Text>
                  <Text className="text-gray-600 text-[14px] leading-[22px] m-0 mt-[4px]">
                    {deliveryAddress || companyAddress}
                  </Text>
                </div>
              </Section>

              {/* Next Steps */}
              <Section className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-600 p-[28px] rounded-[10px] mb-[32px]">
                <Heading className="text-red-900 text-[18px] font-bold mb-[16px] m-0">
                  Next Steps
                </Heading>
                <Text className="text-gray-700 text-[15px] leading-[24px] m-0 mb-[10px]">
                  ✓ Please confirm receipt of this Purchase Order
                </Text>
                <Text className="text-gray-700 text-[15px] leading-[24px] m-0 mb-[10px]">
                  ✓ Provide estimated delivery date
                </Text>
                <Text className="text-gray-700 text-[15px] leading-[24px] m-0">
                  ✓ Send invoice upon order completion
                </Text>
              </Section>

              <Text className="text-gray-600 text-[15px] leading-[26px] mb-[28px]">
                If you have any questions regarding this order, please contact us at{' '}
                <span className="text-red-600 font-medium">{companyEmail}</span> or{' '}
                <span className="text-red-600 font-medium">{companyPhone}</span>.
              </Text>

              <Text className="text-gray-700 text-[16px] leading-[26px] mb-[32px]">
                Thank you for your prompt attention to this order.
              </Text>

              <div className="border-t border-gray-200 pt-[24px]">
                <Text className="text-gray-700 text-[15px] leading-[24px] m-0">
                  Best regards,
                </Text>
                <Text className="text-gray-900 text-[16px] leading-[24px] m-0 mt-[8px] font-bold">
                  {purchaseOrder.createdBy.name || 'Purchasing Department'}
                </Text>
                <Text className="text-red-700 text-[15px] leading-[22px] m-0 font-semibold">
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

PurchaseOrderEmail.PreviewProps = {
  purchaseOrder: {
    id: "po_123",
    poNumber: "PO-2025-001",
    date: new Date("2025-11-18"),
    supplierId: "sup_456",
    supplier: {
      id: "sup_456",
      name: "ABC Supply Company",
      phone: "+233 30 234 5678",
      email: "orders@abcsupply.com",
      address: "45 Industrial Area, Tema, Ghana"
    },
    status: "SUBMITTED",
    subtotal: 4100.00,
    taxAmount: 0,
    shippingCost: 0,
    discount: 0,
    total: 4100.00,
    notes: null,
    paymentTerms: "Net 30 days",
    expectedDeliveryDate: new Date("2025-12-02"),
    createdBy: { name: "John Doe" },
    createdAt: new Date("2025-11-18")
  },
  lineItems: [
    {
      id: "li_1",
      quantity: 10,
      itemId: "item_1",
      unitPrice: 150.00,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      total: 1500.00,
      receivedQuantity: 0,
      item: {
        id: "item_1",
        name: "Office Chairs (Ergonomic)",
        sku: "CHAIR-ERG-001",
        description: "Adjustable height with lumbar support"
      }
    },
    {
      id: "li_2",
      quantity: 5,
      itemId: "item_2",
      unitPrice: 400.00,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      total: 2000.00,
      receivedQuantity: 0,
      item: {
        id: "item_2",
        name: "Standing Desks (Adjustable)",
        sku: "DESK-STD-001",
        description: "Electric height adjustment"
      }
    },
    {
      id: "li_3",
      quantity: 8,
      itemId: "item_3",
      unitPrice: 75.00,
      taxRate: 0,
      taxAmount: 0,
      discount: 0,
      total: 600.00,
      receivedQuantity: 0,
      item: {
        id: "item_3",
        name: "Monitor Arms (Dual)",
        sku: "ARM-MON-002",
        description: "Supports up to 27-inch monitors"
      }
    }
  ],
  companyName: "Tech Solutions Ltd.",
  companyAddress: "123 Business Street, Kumasi, Ghana",
  companyPhone: "+233 20 123 4567",
  companyEmail: "info@techsolutions.com",
  deliveryAddress: "123 Business Street, Suite 100\nKumasi, Ghana"
};

