// components/Forms/user/UserAcceptInviteForm.tsx
"use client";

import { createInvitedUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface UserAcceptInviteFormProps {
  initialEmail: string;
  initialRoleId: string;
  initialLocationId: string;
  orgId: string;
  orgName: string;
  roles: Array<{ label: string; value: string }>;
  locations: Array<{ label: string; value: string }>;
  inviteId?: string;
}

export default function UserAcceptInviteForm({
  initialEmail,
  initialRoleId,
  initialLocationId,
  orgId,
  orgName,
  roles,
  locations,
  inviteId,
}: UserAcceptInviteFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.firstName.trim()) {
      toast.error("First name is required");
      setLoading(false);
      return;
    }

    if (!formData.lastName.trim()) {
      toast.error("Last name is required");
      setLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const userData = {
        email: initialEmail,
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        phone: formData.phone.trim(),
        orgId,
        orgName,
        roleId: initialRoleId,
        locationId: initialLocationId,
        locationName: locations.find(loc => loc.value === initialLocationId)?.label || "",
        image: "",
      };

      console.log("Creating invited user:", userData);
      
      const result = await createInvitedUser(userData);
      console.log("Create user result:", result);
      
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.status === 200) {
        toast.success("Account created successfully! Redirecting to login...");
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        toast.error("Failed to create account");
      }
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={initialEmail}
          disabled
          className="bg-gray-50"
        />
        <p className="text-xs text-gray-500">This is the email you were invited with</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1234567890"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          required
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            required
            disabled={loading}
          />
        </div>
      </div>

      {roles.length > 0 && (
        <div className="space-y-2">
          <Label>Assigned Role</Label>
          <Input
            value={roles.find(r => r.value === initialRoleId)?.label || "User"}
            disabled
            className="bg-gray-50"
          />
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          "Accept Invitation & Create Account"
        )}
      </Button>
    </form>
  );
}