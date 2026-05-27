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
      if (!response.ok) throw new Error('Failed to fetch Credit Saless')
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching Credit Saless:', error)
      toast.error('Failed to load Credit Saless')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSalesOrderById = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sales-orders/${id}`)
      if (!response.ok) throw new Error('Failed to fetch Credit Sales')
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching Credit Sales:', error)
      toast.error('Failed to load Credit Sales')
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
      
      if (!response.ok) throw new Error('Failed to create Credit Sales')
      
      const data = await response.json()
      toast.success('Credit Sales created successfully')
      return data
    } catch (error) {
      console.error('Error creating Credit Sales:', error)
      toast.error('Failed to create Credit Sales')
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
      
      if (!response.ok) throw new Error('Failed to update Credit Sales')
      
      const data = await response.json()
      toast.success('Credit Sales updated successfully')
      return data
    } catch (error) {
      console.error('Error updating Credit Sales:', error)
      toast.error('Failed to update Credit Sales')
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
      
      if (!response.ok) throw new Error('Failed to cancel Credit Sales')
      
      const data = await response.json()
      toast.success('Credit Sales cancelled successfully')
      return data
    } catch (error) {
      console.error('Error cancelling Credit Sales:', error)
      toast.error('Failed to cancel Credit Sales')
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