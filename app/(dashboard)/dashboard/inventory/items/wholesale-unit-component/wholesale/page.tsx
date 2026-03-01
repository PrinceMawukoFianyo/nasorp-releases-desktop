"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Package2, ShoppingCart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { getWholesaleReport, WholesaleReport } from "@/actions/wholesale-report"

const DATE_RANGES = [
  { label: "Today",       value: "today" },
  { label: "Last 7 days", value: "7d"    },
  { label: "Last 30 days",value: "30d"   },
  { label: "Last 90 days",value: "90d"   },
  { label: "Last 12 months", value: "12m"},
]

function currency(n: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency", currency: "GHS", minimumFractionDigits: 2,
  }).format(n)
}

export default function WholesaleReportPage() {
  const [dateRange, setDateRange] = useState("30d")
  const [report,    setReport]    = useState<WholesaleReport | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { load() }, [dateRange])

  const load = async () => {
    setLoading(true)
    try { setReport(await getWholesaleReport(dateRange)) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-3">
      <Spinner className="h-5 w-5" />
      <span className="text-muted-foreground">Loading report…</span>
    </div>
  )

  if (!report) return null
  const s = report.summary

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wholesale & Bulk Sales Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Full breakdown of single vs bulk pack sales — with stock deduction detail per line
          </p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{currency(s.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.totalUnitsSold.toLocaleString()} units sold</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Package2 className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs font-medium text-amber-800">Wholesale Revenue</p>
            </div>
            <p className="text-2xl font-bold text-amber-900">{currency(s.wholesaleRevenue)}</p>
            <p className="text-xs text-amber-700 mt-1">
              {s.wholesaleUnitsSold} units in packs ·{" "}
              {s.totalRevenue > 0
                ? ((s.wholesaleRevenue / s.totalRevenue) * 100).toFixed(0)
                : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-1.5 mb-1">
              <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Single-unit Revenue</p>
            </div>
            <p className="text-2xl font-bold">{currency(s.singleRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.singleUnitsSold} single units</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Pack Types Sold</p>
            <p className="text-2xl font-bold">{s.packBreakdown.length}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {s.packBreakdown.slice(0, 3).map(p => (
                <Badge key={p.tierName} variant="outline" className="text-[10px]">
                  {p.tierName}: {p.packsSold}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pack-type breakdown table */}
      {s.packBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package2 className="h-4 w-4 text-amber-600" />
              Sales by Pack Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Pack Type</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Packs Sold</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Units Deducted</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">% of Wholesale</th>
                  </tr>
                </thead>
                <tbody>
                  {s.packBreakdown.map(p => (
                    <tr key={p.tierName} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-amber-100 rounded">
                            <Package2 className="h-3 w-3 text-amber-600" />
                          </div>
                          <span className="font-medium">{p.tierName}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">{p.packsSold}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{p.unitsSold}</td>
                      <td className="py-2 px-3 text-right font-semibold">{currency(p.revenue)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {s.wholesaleRevenue > 0
                          ? ((p.revenue / s.wholesaleRevenue) * 100).toFixed(0)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed line tabs */}
      <Tabs defaultValue="wholesale">
        <TabsList>
          <TabsTrigger value="wholesale">
            Wholesale Lines ({report.wholesaleLines.length})
          </TabsTrigger>
          <TabsTrigger value="single">
            Single-unit Lines ({report.singleLines.length})
          </TabsTrigger>
        </TabsList>

        {/* Wholesale lines */}
        <TabsContent value="wholesale">
          <Card>
            <CardContent className="pt-4">
              {report.wholesaleLines.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No wholesale sales in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-amber-50/60">
                      <tr>
                        {["Order","Item","Location","Pack","Packs","Units/Pack","Total Units","Price/Pack","Saved/Unit","Total"].map(h => (
                          <th key={h} className="py-2 px-3 text-xs font-medium text-muted-foreground text-left last:text-right">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.wholesaleLines.map((line, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-3">
                            <p className="font-medium text-xs">{line.orderNumber}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(line.orderDate), "dd MMM yy")}
                            </p>
                          </td>
                          <td className="py-2 px-3">
                            <p className="font-medium">{line.itemName}</p>
                            <p className="text-xs text-muted-foreground">{line.sku}</p>
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{line.locationName}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]">
                              {line.tierName}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-semibold">{line.packQuantity}</td>
                          <td className="py-2 px-3 text-muted-foreground">{line.unitsPerPack}</td>
                          <td className="py-2 px-3 font-semibold text-green-700">{line.actualUnits}</td>
                          <td className="py-2 px-3">{currency(line.wholesalePricePerPack)}</td>
                          <td className="py-2 px-3 text-green-600">
                            {line.savingsPerUnit > 0 ? `-${currency(line.savingsPerUnit)}/unit` : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">{currency(line.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Single-unit lines */}
        <TabsContent value="single">
          <Card>
            <CardContent className="pt-4">
              {report.singleLines.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No single-unit sales in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        {["Order","Item","Location","Units","Price/Unit","Total"].map(h => (
                          <th key={h} className="py-2 px-3 text-xs font-medium text-muted-foreground text-left last:text-right">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.singleLines.map((line, i) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-3">
                            <p className="font-medium text-xs">{line.orderNumber}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(line.orderDate), "dd MMM yy")}
                            </p>
                          </td>
                          <td className="py-2 px-3">
                            <p className="font-medium">{line.itemName}</p>
                            <p className="text-xs text-muted-foreground">{line.sku}</p>
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{line.locationName}</td>
                          <td className="py-2 px-3 font-semibold">{line.actualUnits}</td>
                          <td className="py-2 px-3">{currency(line.singleUnitPrice)}</td>
                          <td className="py-2 px-3 text-right font-semibold">{currency(line.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
