"use client"

import { useState } from "react"
import { Eye, EyeOff, Copy, Check, Plus, X, Trash2, Edit2, Ban, RotateCcw, Key } from "lucide-react"
import { toast } from "sonner"
import { timeAgo } from "@/lib/timeAgo"
import { ApiKey } from "@prisma/client"
import { createAPIKey, deleteAPIKey, revokeAPIKey, reactivateAPIKey } from "@/actions/apiKeys"

// Extended type to track visibility state locally
interface ApiKeyWithVisibility extends ApiKey {
  visible?: boolean
}

export function ApiKeyManagement({orgKeys}:{orgKeys: ApiKey[]}) {
  const [apiKeys, setApiKeys] = useState<ApiKeyWithVisibility[]>(
    orgKeys.map(key => ({ ...key, visible: false }))
  )
  const [showModal, setShowModal] = useState(false)
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [editKeyName, setEditKeyName] = useState("")
  const [newKeyName, setNewKeyName] = useState("")
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyWithVisibility | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<ApiKeyWithVisibility | null>(null)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyWithVisibility | null>(null)

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return

    setIsCreating(true)
    try {
      const result = await createAPIKey(newKeyName)
      
      if (result.success && result.data) {
        const newApiKey: ApiKeyWithVisibility = {
          ...result.data,
          visible: false,
        }

        setApiKeys([newApiKey, ...apiKeys])
        setNewlyCreatedKey(newApiKey)
        setShowModal(false)
        setShowNewKeyModal(true)
        setNewKeyName("")
        toast.success(`API key "${newKeyName}" created successfully.`)
      } else {
        toast.error(result.error || "Failed to create API key")
      }
    } catch (error) {
      toast.error("An error occurred while creating the API key")
    } finally {
      setIsCreating(false)
    }
  }

  const openEditModal = (keyItem: ApiKeyWithVisibility) => {
    setEditingKeyId(keyItem.id)
    setEditKeyName(keyItem.name)
    setShowEditModal(true)
  }

  const handleEditKey = () => {
    if (!editKeyName.trim() || editingKeyId === null) return

    setApiKeys(apiKeys.map((k) => (k.id === editingKeyId ? { ...k, name: editKeyName } : k)))
    toast.success(`API key renamed to "${editKeyName}".`)
    setShowEditModal(false)
    setEditingKeyId(null)
    setEditKeyName("")
  }

  const toggleVisibility = (id: string) => {
    setApiKeys(apiKeys.map((k) => (k.id === id ? { ...k, visible: !k.visible } : k)))
  }

  const copyToClipboard = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    toast.success("API key copied to clipboard.")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openRevokeModal = (keyItem: ApiKeyWithVisibility) => {
    setKeyToRevoke(keyItem)
    setShowRevokeModal(true)
  }

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return

    setIsRevoking(keyToRevoke.id)
    try {
      const result = keyToRevoke.isActive 
        ? await revokeAPIKey(keyToRevoke.id)
        : await reactivateAPIKey(keyToRevoke.id)
      
      if (result.success) {
        setApiKeys(apiKeys.map((k) => 
          k.id === keyToRevoke.id ? { ...k, isActive: !k.isActive } : k
        ))
        toast.success(
          keyToRevoke.isActive 
            ? `API key "${keyToRevoke.name}" has been revoked.`
            : `API key "${keyToRevoke.name}" has been reactivated.`
        )
      } else {
        toast.error(result.error || "Failed to update API key status")
      }
    } catch (error) {
      toast.error("An error occurred while updating the API key")
    } finally {
      setIsRevoking(null)
      setShowRevokeModal(false)
      setKeyToRevoke(null)
    }
  }

  const openDeleteModal = (keyItem: ApiKeyWithVisibility) => {
    setKeyToDelete(keyItem)
    setShowDeleteModal(true)
  }

  const handleDeleteKey = async () => {
    if (!keyToDelete) return
    
    setIsDeleting(keyToDelete.id)
    try {
      const result = await deleteAPIKey(keyToDelete.id)
      
      if (result.success) {
        setApiKeys(apiKeys.filter((k) => k.id !== keyToDelete.id))
        toast.error(`API key "${keyToDelete.name}" has been deleted.`)
      } else {
        toast.error("Failed to delete API key")
      }
    } catch (error) {
      toast.error("An error occurred while deleting the API key")
    } finally {
      setIsDeleting(null)
      setShowDeleteModal(false)
      setKeyToDelete(null)
    }
  }

  const maskKey = (key: string) => {
    const prefix = key.substring(0, 8)
    return `${prefix}${"•".repeat(16)}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <Key className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">API Keys</h1>
            <p className="text-sm text-gray-500">Manage your API keys for authentication</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus size={16} />
          <span>Create new key</span>
        </button>
      </div>

      {/* Table */}
      {apiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Key className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium mb-1">No API keys yet</p>
          <p className="text-gray-500 text-sm">Create your first API key to get started</p>
        </div>
        
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apiKeys.map((keyItem) => (
                <tr key={keyItem.id} className={`hover:bg-gray-50 transition-colors ${!keyItem.isActive ? 'opacity-50' : ''}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{keyItem.name}</span>
                      {!keyItem.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Revoked
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleVisibility(keyItem.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={!keyItem.isActive}
                      >
                        {keyItem.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <code className="text-sm text-gray-600 font-mono">
                        {keyItem.visible ? keyItem.key : maskKey(keyItem.key)}
                      </code>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-500">{timeAgo(keyItem.createdAt)}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => copyToClipboard(keyItem.key, keyItem.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Copy key"
                        disabled={!keyItem.isActive}
                      >
                        {copiedId === keyItem.id ? (
                          <>
                            <Check size={16} className="text-green-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(keyItem)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title="Edit key name"
                      >
                        <Edit2 size={16} />
                      </button>
                      {keyItem.isActive ? (
                        <button
                          onClick={() => openRevokeModal(keyItem)}
                          disabled={isRevoking === keyItem.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Revoke key"
                        >
                          <Ban size={16} />
                          <span>Revoke</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openRevokeModal(keyItem)}
                          disabled={isRevoking === keyItem.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="Reactivate key"
                        >
                          <RotateCcw size={16} />
                          <span>Reactivate</span>
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(keyItem)}
                        disabled={isDeleting === keyItem.id}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete key"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-end mb-6">
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create a new key</h2>
            </div>

            <div className="mb-6">
              <label className="block text-gray-900 font-medium mb-2 text-center">Name</label>
              <p className="text-gray-600 text-sm mb-3 text-center">
                Select a name to identify the key in the dashboard.
              </p>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="My API Key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              onClick={handleCreateKey}
              disabled={!newKeyName.trim() || isCreating}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mx-auto"
            >
              {isCreating ? "Creating..." : "Create Key"}
            </button>
            
          </div>
        </div>
      )}

      {showNewKeyModal && newlyCreatedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="mb-6">
              <button
                onClick={() => setShowNewKeyModal(false)}
                className="ml-auto block text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Save your key</h2>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                Please save this key somewhere safe. For security reasons, you won't be able to view it again.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-900 font-medium mb-2 text-center">Your API Key</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg p-4">
                <code className="flex-1 text-sm font-mono text-gray-900 break-all">{newlyCreatedKey.key}</code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey.key, "new")}
                  className="text-gray-600 hover:text-gray-900 flex-shrink-0"
                >
                  {copiedId === "new" ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowNewKeyModal(false)}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showEditModal && editingKeyId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="mb-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="ml-auto block text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit key name</h2>
            </div>

            <div className="mb-6">
              <label className="block text-gray-900 font-medium mb-2 text-center">Name</label>
              <p className="text-gray-600 text-sm mb-3 text-center">
                Select a name to identify the key in the dashboard.
              </p>
              <input
                type="text"
                value={editKeyName}
                onChange={(e) => setEditKeyName(e.target.value)}
                placeholder="My API Key"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              onClick={handleEditKey}
              disabled={!editKeyName.trim()}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && keyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Delete API Key</h2>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm font-medium mb-2">
                Are you sure you want to delete this API key? This action cannot be undone.
              </p>
              <p className="text-red-700 text-sm">
                Once deleted, any applications or services using this key will no longer be able to authenticate.
              </p>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 text-sm">
                <span className="font-medium">Key name:</span> {keyToDelete.name}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteKey}
                disabled={isDeleting === keyToDelete.id}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting === keyToDelete.id ? "Deleting..." : "Delete Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRevokeModal && keyToRevoke && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${keyToRevoke.isActive ? 'bg-orange-100' : 'bg-green-100'}`}>
                  {keyToRevoke.isActive ? (
                    <Ban size={24} className="text-orange-600" />
                  ) : (
                    <RotateCcw size={24} className="text-green-600" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {keyToRevoke.isActive ? 'Revoke API Key' : 'Reactivate API Key'}
                </h2>
              </div>
              <button
                onClick={() => setShowRevokeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className={`border rounded-lg p-4 mb-6 ${
              keyToRevoke.isActive 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-sm font-medium mb-2 ${
                keyToRevoke.isActive ? 'text-orange-800' : 'text-green-800'
              }`}>
                {keyToRevoke.isActive 
                  ? 'Are you sure you want to revoke this API key? This action cannot be undone.'
                  : 'Are you sure you want to reactivate this API key?'}
              </p>
              <p className={`text-sm ${
                keyToRevoke.isActive ? 'text-orange-700' : 'text-green-700'
              }`}>
                {keyToRevoke.isActive
                  ? 'Once revoked, any applications or services using this key will no longer be able to authenticate.'
                  : 'Once reactivated, applications can use this key to authenticate again.'}
              </p>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 text-sm">
                <span className="font-medium">Key name:</span> {keyToRevoke.name}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeKey}
                disabled={isRevoking === keyToRevoke.id}
                className={`flex-1 text-white py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${
                  keyToRevoke.isActive
                    ? 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300'
                    : 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                }`}
              >
                {isRevoking === keyToRevoke.id 
                  ? (keyToRevoke.isActive ? "Revoking..." : "Reactivating...") 
                  : (keyToRevoke.isActive ? "Revoke Key" : "Reactivate Key")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 