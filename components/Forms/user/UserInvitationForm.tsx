"use client";

import { sendInvite, createUserWithPassword } from "@/actions/users";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
};

type CreationMode = "invite" | "password";

const DEFAULT_PASSWORD = "Admin@2026";

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
  const [mode, setMode] = useState<CreationMode>("invite");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(DEFAULT_PASSWORD);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [selectedLocation, setSelectedLocation] = useState(
    locations[0] || roles[0]
  );
  const [open, setOpen] = useState(false);

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setPassword(DEFAULT_PASSWORD);
    setErr("");
    setMode("invite");
  };

  const validate = () => {
    if (!email.trim()) return "Email is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";

    if (mode === "password") {
      if (!firstName.trim()) return "First name is required";
      if (!lastName.trim()) return "Last name is required";
      if (!phone.trim()) return "Phone number is required";
      if (!password.trim() || password.trim().length < 6)
        return "Password must be at least 6 characters";
    }

    return "";
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErr("");

    const validationError = validate();
    if (validationError) {
      setErr(validationError);
      setLoading(false);
      return;
    }

    try {
      if (mode === "invite") {
        const data: InviteData = {
          email: email.trim(),
          orgId,
          orgName,
          roleName: selectedRole.label,
          roleId: selectedRole.value,
          locationName: selectedLocation?.label || "",
          locationId: selectedLocation?.value || "",
        };

        const res = await sendInvite(data);

        if (res && res.error) {
          toast.error(res.error);
        } else if (res && res.status === 200) {
          toast.success("Invite sent successfully!");
          resetForm();
          setOpen(false);
        } else {
          toast.error("Failed to send invitation");
        }
      } else {
        const data = {
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
          password: password.trim(),
          orgId,
          orgName,
          roleId: selectedRole.value,
          locationId: selectedLocation?.value || "",
          locationName: selectedLocation?.label || "",
        };

        const res = await createUserWithPassword(data as any);

        if (res && res.error) {
          toast.error(res.error);
        } else if (res && res.status === 200) {
          toast.success(
            `User created — login sent to ${data.email}`
          );
          resetForm();
          setOpen(false);
        } else {
          toast.error("Failed to create user");
        }
      }
    } catch (error: any) {
      console.error("User creation error:", error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <UserPlus className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add User
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <Card className="w-full border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Enter User Details</CardTitle>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4 px-6">
            <div className="flex flex-col w-full gap-4">
              <RadioGroup
                value={mode}
                onValueChange={(v) => {
                  setMode(v as CreationMode);
                  setErr("");
                }}
                className="flex flex-col gap-2"
                disabled={loading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="invite" id="mode-invite" />
                  <Label htmlFor="mode-invite" className="font-normal cursor-pointer">
                    Invite via email — they set their own password
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="password" id="mode-password" />
                  <Label htmlFor="mode-password" className="font-normal cursor-pointer">
                    Create now with a password — they can change it later
                  </Label>
                </div>
              </RadioGroup>

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
                  disabled={loading}
                />
              </div>

              {mode === "password" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setErr("");
                      }}
                      disabled={loading}
                    />
                    <Input
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setErr("");
                      }}
                      disabled={loading}
                    />
                  </div>
                  <Input
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErr("");
                    }}
                    disabled={loading}
                  />
                  <div>
                    <Label htmlFor="password" className="text-sm text-muted-foreground">
                      Password (defaults to {DEFAULT_PASSWORD} — edit if you want a
                      different one)
                    </Label>
                    <Input
                      id="password"
                      className="w-full mt-1"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErr("");
                      }}
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              {err && <p className="text-red-500 text-sm">{err}</p>}

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
                  {mode === "invite" ? "Sending Invite..." : "Creating User..."}
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {mode === "invite" ? "Send Invitation" : "Create User"}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}