// app/dashboard/fix-permissions/page.tsx
"use client";

import { grantFullAdminPermissions } from "@/actions/fix-permission";
import { useState } from "react";

export default function FixPermissionsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFix() {
    setLoading(true);
    setMessage("");
    try {
      const result = await grantFullAdminPermissions();
      if (result.success) {
        setMessage(`✅ Success! ${result.added} new permissions added. Please log out and log in again.`);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Fix Admin Permissions</h1>
      <p className="mb-4 text-gray-600">
        This will grant your admin role all permissions defined in the sidebar.
        Click once, then log out and back in.
      </p>
      <button
        onClick={handleFix}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Updating..." : "Grant Full Permissions"}
      </button>
      {message && <p className="mt-4 whitespace-pre-wrap">{message}</p>}
    </div>
  );
}