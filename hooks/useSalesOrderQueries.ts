// hooks/useSalesOrderQueries.ts
"use client"

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export const useSalesOrderQueries = () => {
  const [isLoading, setIsLoading] = useState(false)

  const fetchSalesOrders = useCallback(async (filters?: { status?: string; paymentStatus?: string }) => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (filters?.status) queryParams.append('status', filters.status)
      if (filters?.paymentStatus) queryParams.append('paymentStatus', filters.paymentStatus)

      const response = await fetch(`/api/sales-orders?${queryParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch sales orders')
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching sales orders:', error)
      toast.error('Failed to load sales orders')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSalesOrderById = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sales-orders/${id}`)
      if (!response.ok) throw new Error('Failed to fetch sales order')
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching sales order:', error)
      toast.error('Failed to load sales order')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createSalesOrder = useCallback(async (orderData: any) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      
      if (!response.ok) throw new Error('Failed to create sales order')
      
      const data = await response.json()
      toast.success('Sales order created successfully')
      return data
    } catch (error) {
      console.error('Error creating sales order:', error)
      toast.error('Failed to create sales order')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSalesOrder = useCallback(async (id: string, orderData: any) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sales-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      
      if (!response.ok) throw new Error('Failed to update sales order')
      
      const data = await response.json()
      toast.success('Sales order updated successfully')
      return data
    } catch (error) {
      console.error('Error updating sales order:', error)
      toast.error('Failed to update sales order')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const cancelSalesOrder = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sales-orders/${id}/cancel`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to cancel sales order')
      
      const data = await response.json()
      toast.success('Sales order cancelled successfully')
      return data
    } catch (error) {
      console.error('Error cancelling sales order:', error)
      toast.error('Failed to cancel sales order')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendOrderEmail = useCallback(async (orderId: string, recipientEmail: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sales-orders/${orderId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail }),
      })
      
      if (!response.ok) throw new Error('Failed to send email')
      
      const data = await response.json()
      toast.success('Email sent successfully')
      return data
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    fetchSalesOrders,
    fetchSalesOrderById,
    createSalesOrder,
    updateSalesOrder,
    cancelSalesOrder,
    sendOrderEmail,
  }
}