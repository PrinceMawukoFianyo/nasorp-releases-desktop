// app/dashboard/pos/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Search, Plus, Minus, Trash2, User, MapPin, DollarSign, CreditCard, Banknote, X, Check, Receipt, Loader2, ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { 
  getPOSItems, 
  getPOSCategories, 
  getPOSCustomers, 
  getPOSLocations,
  createPOSSale,
  createQuickCustomer
} from "@/actions/pos"

interface CartItem {
  id: string
  name: string
  sku: string
  price: number
  quantity: number
  stock: number
  taxRate: number
  categoryId?: string
}

export default function POSPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedLocation, setSelectedLocation] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "MOBILE_MONEY">("CASH")
  const [discount, setDiscount] = useState(0)
  const [orderTax, setOrderTax] = useState(0)
  const [shipping, setShipping] = useState(0)
  
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "" })
  const [lastOrderId, setLastOrderId] = useState("")
  const [lastOrderNumber, setLastOrderNumber] = useState("")
  
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedLocation) {
      loadItems(selectedLocation)
    }
  }, [selectedLocation])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [categoriesRes, itemsRes, customersRes, locationsRes] = await Promise.all([
        getPOSCategories(),
        getPOSItems(),
        getPOSCustomers(),
        getPOSLocations(),
      ])

      if (categoriesRes.success && categoriesRes.data) setCategories(categoriesRes.data)
      if (itemsRes.success && itemsRes.data) setItems(itemsRes.data)
      if (customersRes.success && customersRes.data) setCustomers(customersRes.data)
      if (locationsRes.success && locationsRes.data) {
        setLocations(locationsRes.data)
        if (locationsRes.data.length > 0) {
          setSelectedLocation(locationsRes.data[0].id)
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Failed to load POS data")
    } finally {
      setIsLoading(false)
    }
  }

  const loadItems = async (locationId: string) => {
    try {
      const result = await getPOSItems(locationId)
      if (result.success && result.data) {
        setItems(result.data)
      }
    } catch (error) {
      console.error("Error loading items:", error)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const addToCart = (item: any) => {
    if (!selectedLocation) {
      toast.error("Please select a location first")
      return
    }

    const inventory = item.inventories?.find((inv: any) => inv.locationId === selectedLocation)
    const stock = inventory?.quantity || 0

    if (stock <= 0) {
      toast.error(`${item.name} is out of stock`)
      return
    }

    const existingItem = cart.find(cartItem => cartItem.id === item.id)
    
    if (existingItem) {
      if (existingItem.quantity >= stock) {
        toast.error(`Cannot add more. Only ${stock} available`)
        return
      }
      updateQuantity(item.id, existingItem.quantity + 1)
    } else {
      const cartItem: CartItem = {
        id: item.id,
        name: item.name,
        sku: item.sku || '',
        price: item.sellingPrice || 0,
        quantity: 1,
        stock: stock,
        taxRate: 16,
        categoryId: item.categoryId || undefined,
      }
      setCart([...cart, cartItem])
      toast.success(`${item.name} added to cart`)
    }
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    const item = cart.find(i => i.id === itemId)
    if (!item) return

    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    if (newQuantity > item.stock) {
      toast.error(`Only ${item.stock} available`)
      return
    }

    setCart(cart.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ))
  }

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const calculateTax = () => {
    return cart.reduce((sum, item) => {
      const itemSubtotal = item.price * item.quantity
      return sum + (itemSubtotal * (item.taxRate / 100))
    }, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + shipping - discount
  }

  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      toast.error("Customer name is required")
      return
    }

    setIsAddingCustomer(true)
    try {
      const result = await createQuickCustomer(newCustomer)
      
      if (result.success && result.data) {
        toast.success("Customer added successfully")
        setCustomers([...customers, result.data])
        setSelectedCustomer(result.data.id)
        setShowAddCustomerModal(false)
        setShowCustomerModal(false)
        setNewCustomer({ name: "", email: "", phone: "" })
      } else {
        toast.error(result.error || "Failed to add customer")
      }
    } catch (error) {
      console.error("Error adding customer:", error)
      toast.error("An error occurred")
    } finally {
      setIsAddingCustomer(false)
    }
  }

  const handleCompleteSale = async () => {
    if (!selectedLocation) {
      toast.error("Please select a location")
      return
    }

    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }

    setIsProcessing(true)
    try {
      const saleData = {
        customerId: selectedCustomer || undefined,
        locationId: selectedLocation,
        paymentMethod: paymentMethod,
        lines: cart.map(item => ({
          itemId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
          taxRate: item.taxRate,
        })),
        discount: discount,
        shippingCost: shipping,
        notes: "POS Sale",
      }

      const result = await createPOSSale(saleData)
      
      if (result.success && result.orderId && result.orderNumber) {
        setLastOrderId(result.orderId)
        setLastOrderNumber(result.orderNumber)
        setShowPaymentModal(false)
        setShowInvoiceModal(true)
        toast.success("Sale completed successfully!")
        
        await loadItems(selectedLocation)
      } else {
        toast.error(result.error || "Failed to complete sale")
      }
    } catch (error) {
      console.error("Error completing sale:", error)
      toast.error("An error occurred while processing the sale")
    } finally {
      setIsProcessing(false)
    }
  }

  const resetPOS = () => {
    setCart([])
    setSelectedCustomer("")
    setDiscount(0)
    setOrderTax(0)
    setShipping(0)
    setShowInvoiceModal(false)
    setLastOrderId("")
    setLastOrderNumber("")
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
  const selectedLocationData = locations.find(l => l.id === selectedLocation)

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Loading POS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">BUSINESS INVENTORY</h1>
                <p className="text-xs text-slate-500">Point of Sale System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Quick Receipt Navigation - Only show when we have a recent order */}
            {lastOrderId && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2 border border-blue-200">
                <Button
                  onClick={() => window.open(`/dashboard/sales/orders/${lastOrderId}/simple-receipt`, '_blank')}
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-blue-700 hover:text-blue-800 hover:bg-blue-100"
                >
                  <Receipt className="w-3 h-3" />
                  Simple Receipt
                </Button>
                <div className="h-4 w-px bg-blue-300"></div>
                <Button
                  onClick={() => window.open(`/dashboard/sales/orders/${lastOrderId}/invoice`, '_blank')}
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-blue-700 hover:text-blue-800 hover:bg-blue-100"
                >
                  <FileText className="w-3 h-3" />
                  Full Invoice
                </Button>
              </div>
            )}
            
            {/* View Orders Button */}
            <Button
              onClick={() => router.push('/dashboard/sales/orders')}
              size="sm"
              variant="outline"
              className="h-8 gap-1"
            >
              <Receipt className="w-3 h-3" />
              View Orders
            </Button>

            <div className="text-right">
              <button
                onClick={() => {
                  if (lastOrderId) {
                    window.open(`/dashboard/sales/orders/${lastOrderId}/simple-receipt`, '_blank')
                  }
                }}
                className={`text-sm font-semibold ${
                  lastOrderId 
                    ? "text-slate-900 hover:text-blue-600 cursor-pointer transition-colors" 
                    : "text-slate-900 cursor-default"
                }`}
              >
                Invoice No: #{lastOrderNumber || "000000"}
              </button>
              <p className="text-xs text-slate-500">
                {new Date().toLocaleDateString('en-GH', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        <div className="px-6 py-3 bg-slate-50 border-t flex items-center gap-4">
          <div className="flex-1 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm min-w-[200px]">
              <User className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => setShowCustomerModal(true)}
                className="flex-1 text-left text-sm font-medium text-slate-700 truncate hover:text-blue-600 transition-colors"
              >
                {selectedCustomerData ? selectedCustomerData.name : "Select Customer"}
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm min-w-[200px]">
              <MapPin className="w-4 h-4 text-slate-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="flex-1 text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="">Select Location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="p-4 bg-white border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search product code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="p-4 bg-white border-b overflow-x-auto">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="whitespace-nowrap"
              >
                All Products
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap"
                >
                  {category.title}
                  {category._count?.items > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {category._count.items}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredItems.map(item => {
                const inventory = item.inventories?.find((inv: any) => inv.locationId === selectedLocation)
                const stock = inventory?.quantity || 0
                
                return (
                  <Card
                    key={item.id}
                    onClick={() => stock > 0 && addToCart(item)}
                    className={`overflow-hidden group ${stock > 0 ? 'cursor-pointer hover:shadow-xl hover:scale-105' : 'opacity-60'} transition-all duration-200`}
                  >
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative">
                      {item.imageUrl && item.imageUrl.length > 0 ? (
                        <img src={item.imageUrl[0]} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-6xl">📦</div>
                      )}
                      {stock <= 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                        </div>
                      )}
                      {stock > 0 && stock <= 5 && (
                        <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-slate-500 mb-1">{item.sku}</p>
                      <h3 className="font-semibold text-sm text-slate-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          GHS{(item.sellingPrice || 0).toFixed(2)}
                        </span>
                        <span className={`text-xs font-medium ${stock <= 5 ? 'text-red-600' : 'text-slate-500'}`}>
                          {stock} in stock
                        </span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
            
            {filteredItems.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm mt-2">Try adjusting your search or filter</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Cart Section */}
        <div className="w-[420px] bg-white border-l flex flex-col shadow-xl">
          <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Order List ({cart.length} items)
            </h2>
          </div>

          {/* Customer Info in Cart - COMPRESSED */}
          {(selectedCustomerData || selectedCustomer === "") && (
            <div className="p-2 bg-blue-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-xs truncate">
                    {selectedCustomerData ? selectedCustomerData.name : "Walk-in Customer"}
                  </p>
                  {selectedCustomerData ? (
                    <>
                      {selectedCustomerData.email && (
                        <p className="text-[10px] text-slate-600 truncate">{selectedCustomerData.email}</p>
                      )}
                      {selectedCustomerData.phone && (
                        <p className="text-[10px] text-slate-600">{selectedCustomerData.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-600">No customer details</p>
                  )}
                </div>
                {selectedCustomer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer("")}
                    className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Cart Items - COMPRESSED */}
          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                <ShoppingCart className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-lg font-medium">Cart is empty</p>
                <p className="text-sm text-center mt-2">Add products to get started</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {cart.map(item => (
                  <Card key={item.id} className="p-2 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-2">
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">📦</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-tight mb-0.5">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 mb-2">{item.sku}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 bg-slate-50 rounded p-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-7 text-center font-semibold text-xs">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-6 w-6 p-0 hover:bg-green-50 hover:text-green-600"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t flex items-center justify-between">
                      <span className="text-[10px] text-slate-600">
                        GHS{item.price.toFixed(2)} × {item.quantity}
                      </span>
                      <span className="font-bold text-xs text-blue-600">
                        GHS{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Summary - COMPRESSED */}
          {cart.length > 0 && (
            <div className="border-t bg-slate-50">
              <div className="p-3 space-y-2">
                {/* Discount Input - COMPRESSED */}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-slate-600 w-16">Discount</Label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="h-8 text-xs"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Totals - COMPRESSED */}
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Sub-Total:</span>
                    <span className="font-semibold">GHS{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Tax:</span>
                    <span className="font-semibold">GHS{calculateTax().toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Discount:</span>
                      <span className="font-semibold text-red-600">-GHS{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-300">
                    <span className="font-bold text-slate-900 text-sm">Total:</span>
                    <span className="font-bold text-lg text-blue-600">
                      GHS{calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons - COMPRESSED */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setCart([])}
                    className="flex-1 h-9 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex-1 h-9 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
                  >
                    Pay Now
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Selection Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>
              Choose a customer or add a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Search customers..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full"
            />
            
            {/* Walk-in Customer Option */}
            <Card
              onClick={() => {
                setSelectedCustomer("")
                setShowCustomerModal(false)
                setCustomerSearch("")
              }}
              className="p-3 cursor-pointer hover:bg-slate-50 transition-colors border-blue-200 bg-blue-50"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">Walk-in Customer</p>
                  <p className="text-xs text-blue-700">For customers not in the system</p>
                </div>
              </div>
            </Card>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredCustomers.map(customer => (
                  <Card
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer.id)
                      setShowCustomerModal(false)
                      setCustomerSearch("")
                    }}
                    className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <p className="font-semibold text-sm">{customer.name}</p>
                    {customer.email && (
                      <p className="text-xs text-slate-500">{customer.email}</p>
                    )}
                    {customer.phone && (
                      <p className="text-xs text-slate-500">{customer.phone}</p>
                    )}
                  </Card>
                ))}
                {filteredCustomers.length === 0 && customerSearch && (
                  <p className="text-center text-slate-500 py-8">No customers found</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowCustomerModal(false)
                setShowAddCustomerModal(true)
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Modal */}
      <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter customer details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="+233 123 456 789"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCustomerModal(false)
                setNewCustomer({ name: "", email: "", phone: "" })
              }}
              disabled={isAddingCustomer}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomer}
              disabled={isAddingCustomer || !newCustomer.name}
            >
              {isAddingCustomer ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Select payment method and confirm
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-2">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">GHS{calculateTotal().toFixed(2)}</p>
            </div>

            <div>
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Method
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'CASH', label: 'Cash', icon: Banknote },
                  { value: 'CARD', label: 'Card', icon: CreditCard },
                  { value: 'MOBILE_MONEY', label: 'Mobile', icon: DollarSign },
                ].map(method => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value as any)}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === method.value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <method.icon className={`w-6 h-6 ${
                      paymentMethod === method.value ? 'text-blue-600' : 'text-slate-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      paymentMethod === method.value ? 'text-blue-600' : 'text-slate-600'
                    }`}>
                      {method.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Ready to complete sale</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>{cart.length} items in cart</li>
                    <li>Location: {selectedLocationData?.name}</li>
                    {selectedCustomerData && <li>Customer: {selectedCustomerData.name}</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteSale}
              disabled={isProcessing}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal with Receipt Options - FIXED ROUTES */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="sm:max-w-[450px]">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-xl mb-2">Payment Successful!</h3>
            <p className="text-slate-600 mb-4">Your transaction has been completed</p>
            
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600 mb-1">Receipt Number</p>
              <p className="font-bold text-lg text-slate-900">{lastOrderNumber}</p>
              <p className="text-sm text-slate-500 mt-2">
                {new Date().toLocaleString()}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => window.open(`/dashboard/sales/orders/${lastOrderId}/simple-receipt`, '_blank')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <Receipt className="w-4 h-4 mr-2" />
                View Simple Receipt
              </Button>
              <Button
                onClick={() => window.open(`/dashboard/sales/orders/${lastOrderId}/invoice`, '_blank')}
                variant="outline"
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Detailed Invoice
              </Button>
              <Button
                variant="ghost"
                onClick={resetPOS}
                className="w-full hover:bg-slate-100"
              >
                New Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}