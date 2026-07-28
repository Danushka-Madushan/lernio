"use client";

import { useState } from 'react';
import ConfirmDeleteModal from './ZoomAccountmDeleteConfirmModal';
import { Check, Loader2, Plus, Settings, Trash2, UserCircle2, X } from 'lucide-react';
import ZoomScopesInfoButton from './ZoomScopesInfoButton';
import { Button } from '@heroui/react';
import AccountAvatar from './AccountAvatar';

interface ZoomAccount {
  id: string;
  name: string;
  email: string;
  accountId: string;
  clientId: string;
  picUrl?: string | null;
}
const ManageZoomAccountsModal = ({ zoomAccounts, loading, onAdd, onDelete, onCancel }: {
  zoomAccounts: ZoomAccount[]; loading: boolean;
  onAdd: (name: string, email: string, accountId: string, clientId: string, clientSecret: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onCancel: () => void;
}) => {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ZoomAccount | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onAdd(name, email, accountId, clientId, clientSecret);
    if (success) {
      setAdding(false);
      setName(''); setEmail(''); setAccountId(''); setClientId(''); setClientSecret('');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const success = await onDelete(deleteTarget.id);
    if (success) setDeleteTarget(null);
  };

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && !deleteTarget && onCancel()}>

      {deleteTarget && (
        <ConfirmDeleteModal
          targetName={deleteTarget.name}
          loading={loading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="w-full max-w-2xl my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="bg-linear-to-br from-blue-500 via-[#3949ab] to-[#283593] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Settings size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Manage Zoom Accounts</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 min-h-70">
          {adding ? (
            <form onSubmit={handleAdd} className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-blue-900">Add Server-to-Server OAuth Account</h3>
                <ZoomScopesInfoButton />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Identifier Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Host Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Account ID</label>
                <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} required disabled={loading}
                  className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Client ID</label>
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Client Secret</label>
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onPress={() => setAdding(false)} isDisabled={loading}>Cancel</Button>
                <Button type="submit" size="sm" variant="primary" isDisabled={loading} isPending={loading}>
                  {({ isPending }) => (<>{isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save Account</>)}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#202124]">Configured Accounts</h3>
                <Button size="sm" variant="outline" className="bg-blue-100 text-blue-700 font-medium" onPress={() => setAdding(true)}>
                  <Plus size={14} /> Add Account
                </Button>
              </div>

              {zoomAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-[#9aa0a6] bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <UserCircle2 size={28} className="mb-2 text-gray-300" />
                  No Zoom accounts configured. Add one to use API-based meetings.
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {zoomAccounts.map(account => (
                    <div key={account.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                      <AccountAvatar name={account.name} picUrl={account.picUrl} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#202124] truncate">{account.name}</p>
                        <p className="text-xs text-[#5f6368] truncate">{account.email}</p>
                      </div>
                      <Button isIconOnly size="sm" variant="outline" className="bg-red-50 text-red-600 hover:bg-red-100"
                        onPress={() => setDeleteTarget(account)} isDisabled={loading}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageZoomAccountsModal;
