// components/dashboard/Tables/InvitesTable.tsx - COMPLETE
"use client"

import { useState, useMemo, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export type Invite = {
  id: string,
  email: string,
  status: boolean,
  createdAt: Date,
  updatedAt: Date,
  roleId?: string,
  locationId?: string,
}

export default function InvitesTable({ data }: { data: Invite[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [invites, setInvites] = useState<Invite[]>(data || [])

  // Update invites when data prop changes
  useEffect(() => {
    setInvites(data || [])
  }, [data])

  // Filter invites based on search query
  const filteredInvites = useMemo(() => {
    if (!invites || invites.length === 0) return []
    
    return invites.filter((invite) => 
      invite.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, invites])

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A"
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      return "Invalid date"
    }
  }

  const getStatusBadge = (status: boolean) => {
    if (status) {
      return (
        <Badge
          className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
        >
          Accepted
        </Badge>
      )
    }
    
    return (
      <Badge
        variant="secondary"
        className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200"
      >
        Pending
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pending Invitations</h2>
        <p className="text-muted-foreground">
          Manage and track user invitations sent to join your organization.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Email Address</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Invited Date</TableHead>
              <TableHead className="font-semibold">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvites.length > 0 ? (
              filteredInvites.map((invite) => (
                <TableRow key={invite.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{invite.email}</span>
                      <span className="text-xs text-muted-foreground">
                        ID: {invite.id.substring(0, 8)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invite.status)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invite.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invite.updatedAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  {invites.length === 0 
                    ? "No invitations found. Start by inviting a new user."
                    : "No matching invitations found. Try a different search term."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count and info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {filteredInvites.length} of {invites.length} invitation(s)
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></div>
            <span>Accepted</span>
          </div>
        </div>
      </div>
    </div>
  )
}