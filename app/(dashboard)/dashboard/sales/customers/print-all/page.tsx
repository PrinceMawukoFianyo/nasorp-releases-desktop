// app/dashboard/sales/customers/print-all/page.tsx
import { getBriefCustomers } from "@/actions/customers";
import { getCustomerStatement } from "@/actions/customers";
import { formatCurrency, formatDate } from "../../orders/so-utils";


export default async function PrintAllStatementsPage() {
  const customers = await getBriefCustomers();
  const statements = await Promise.all(
    customers.map(async (c) => ({
      customer: c,
      ...(await getCustomerStatement(c.id)),
    }))
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {statements.map(({ customer, transactions, totalPaid, totalOwing }) => (
        <div key={customer.id} className="mb-12 break-before-page">
          <h2 className="text-xl font-bold">{customer.name}</h2>
          <p>{customer.phone} {customer.email && `| ${customer.email}`}</p>
          <table className="w-full border mt-4">
            <thead className="bg-muted"><tr><th>Date</th><th>Document #</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i}><td>{formatDate(t.date)}</td><td>{t.number}</td><td>{t.type}</td><td>{formatCurrency(t.amount)}</td><td>{t.status}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-right">
            <p>Total Paid: {formatCurrency(totalPaid)}</p>
            <p className="font-bold">Amount Owing: {formatCurrency(totalOwing)}</p>
          </div>
        </div>
      ))}
      <div className="text-center mt-8 no-print">
        <button onClick={() => window.print()} className="bg-primary text-white px-4 py-2 rounded">Print All Statements</button>
      </div>
    </div>
  );
}