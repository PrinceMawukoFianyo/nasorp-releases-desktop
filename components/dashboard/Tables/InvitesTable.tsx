"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { types } from "util"


// Mock data - replace with actual API call
const mockInvites: Invite[] = [
  {
    id: "1",
    email: "john@example.com",
    status: true,
    createdAt: new Date("2024-10-15"),
    updatedAt: new Date("2024-10-17"),
  },
  {
    id: "2",
    email: "jane@example.com",
    status: false,
    createdAt: new Date("2024-10-18"),
    updatedAt: new Date("2024-10-18"),
  },
  {
    id: "3",
    email: "bob@example.com",
    status: true,
    createdAt: new Date("2024-10-10"),
    updatedAt: new Date("2024-10-16"),
  },
  {
    id: "4",
    email: "alice@example.com",
    status: false,
    createdAt: new Date("2024-10-19"),
    updatedAt: new Date("2024-10-19"),
  },
]

export type Invite = {
  id: string,
  email: string,
  status: boolean,
  createdAt: Date,
  updatedAt: Date,
}

export default function InvitesTable({data}:{data:Invite[]}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [invites, setInvites] = useState<Invite[]>(data);

  // Filter invites based on search query
  const filteredInvites = useMemo(() => {
    return mockInvites.filter((invite) => invite.email.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email..."
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
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Updated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvites.length > 0 ? (
              filteredInvites.map((invite) => (
                <TableRow key={invite.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={invite.status ? "default" : "secondary"}
                      className={invite.status ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                    >
                      {invite.status ? "Success" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(invite.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(invite.updatedAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No invites found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredInvites.length} of {mockInvites.length} invites
      </div>
    </div>
  )
}
