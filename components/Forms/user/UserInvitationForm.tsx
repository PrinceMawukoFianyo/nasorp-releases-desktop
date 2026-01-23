"use client";

import { sendInvite } from "@/actions/users";
import FormSelectInput from "@/components/FormInputs/FormSelectInput";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type InviteData = {
  email: string;
  orgId: string;
  orgName: string;
  roleId: string;
  roleName: string;
  locationId: string;
  locationName: string;
}

export function UserInvitationForm({
  locations,
  roles,
  orgId,
  orgName,
}: {
  locations: {
    label: string;
    value: string;
  }[];
  roles: {
    label: string;
    value: string;
  }[];
  orgId: string;
  orgName: string;
}) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [selectedLocation, setSelectedLocation] = useState(locations[0] || roles[0]);
  const [open, setOpen] = useState(false);

  const sendInvitation = async () => {
    setLoading(true);
    setErr("");

    // Validation
    if (!email.trim()) {
      setErr("Email is required");
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErr("Please enter a valid email address");
      setLoading(false);
      return;
    }

    const data: InviteData = {
      email: email.trim(),
      orgId,
      orgName,
      roleName: selectedRole.label,
      roleId: selectedRole.value,
      locationName: selectedLocation?.label || "",
      locationId: selectedLocation?.value || "",
    };

    console.log("Sending invite data:", data);

    try {
      const res = await sendInvite(data);
      console.log("Invite response:", res);

      // Check if response exists and has error
      if (res && res.error) {
        toast.error(res.error);
      } 
      // Check if response exists and is successful
      else if (res && res.status === 200) {
        toast.success("Invite sent successfully!");
        setEmail(""); // Clear form
        setOpen(false); // Close dialog
      } 
      // Handle other cases
      else {
        toast.error("Failed to send invitation");
      }
    } catch (error: any) {
      console.error("Invite error:", error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <UserPlus className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Invite User
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
        </DialogHeader>
        <Card className="w-full border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Enter User Details</CardTitle>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4 px-6">
            <div className="flex flex-col w-full gap-3">
              <div>
                <Input
                  className="w-full"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErr("");
                  }}
                  onKeyPress={(e) => e.key === "Enter" && sendInvitation()}
                  disabled={loading}
                />
                {err && <p className="text-red-500 text-sm mt-1">{err}</p>}
              </div>

              <FormSelectInput
                label="Select Location"
                options={locations}
                option={selectedLocation}
                setOption={setSelectedLocation}
              />

              <FormSelectInput
                label="Select Role"
                options={roles}
                option={selectedRole}
                setOption={setSelectedRole}
              />

              {loading ? (
                <Button disabled className="w-full">
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Sending Invite...
                </Button>
              ) : (
                <Button onClick={sendInvitation} className="w-full" disabled={loading}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invitation
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}