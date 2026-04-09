"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2, Link2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const PLATFORMS = ["META", "GOOGLE", "DV360"];
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];
const INDUSTRIES = ["E-Commerce", "D2C / Consumer", "SaaS", "EdTech", "FinTech", "HealthTech", "Real Estate", "Agency"];

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // New brand form state
  const [form, setForm] = useState({ name: "", color: "#6366f1", industry: "E-Commerce", target_roas: "3.0", monthly_budget_cap: "0", logo_url: "", website_url: "" });

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  // New account map state
  const [accountForm, setAccountForm] = useState({ brand_id: "", platform: "META", account_id: "", account_name: "" });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/brands/`);
      setBrands(r.data);
    } catch { showToast("Failed to load brands", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleCreateBrand = async () => {
    if (!form.name.trim()) return showToast("Brand name is required", "error");
    try {
      await axios.post(`${API}/brands/`, { ...form, target_roas: parseFloat(form.target_roas), monthly_budget_cap: parseFloat(form.monthly_budget_cap) });
      showToast(`Brand "${form.name}" created!`);
      setShowCreate(false);
      setForm({ name: "", color: "#6366f1", industry: "E-Commerce", target_roas: "3.0", monthly_budget_cap: "0", logo_url: "", website_url: "" });
      fetchBrands();
    } catch { showToast("Failed to create brand", "error"); }
  };


  const handleUpdateBrand = async () => {
    if (!form.name.trim()) return showToast("Brand name is required", "error");
    if (!editingBrand) return showToast("No brand selected for editing", "error");

    try {
      await axios.put(`${API}/brands/${editingBrand.id}`, {
        ...form,
        target_roas: parseFloat(form.target_roas),
        monthly_budget_cap: parseFloat(form.monthly_budget_cap)
      });
      showToast(`Brand "${form.name}" updated!`);
      setShowEdit(false);
      setEditingBrand(null);
      setForm({ name: "", color: "#6366f1", industry: "E-Commerce", target_roas: "3.0", monthly_budget_cap: "0", logo_url: "", website_url: "" });
      fetchBrands();
    } catch (error) {
      console.error("Failed to update brand:", error);
      showToast("Failed to update brand", "error");
    }
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    if (!confirm(`Delete brand "${name}" and all its account mappings?`)) return;
    try {
      await axios.delete(`${API}/brands/${id}`);
      showToast(`Brand "${name}" deleted`);
      fetchBrands();
    } catch { showToast("Failed to delete brand", "error"); }
  };

  const handleMapAccount = async (brandId: string) => {
    const payload = { ...accountForm, brand_id: brandId };
    if (!payload.account_id.trim()) return showToast("Account ID is required", "error");
    try {
      await axios.post(`${API}/brands/accounts`, payload);
      showToast(`Account ${payload.account_id} mapped!`);
      setAccountForm({ brand_id: "", platform: "META", account_id: "", account_name: "" });
      fetchBrands();
    } catch { showToast("Failed to map account (may already exist)", "error"); }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      await axios.delete(`${API}/brands/accounts/${accountId}`);
      showToast("Account unmapped");
      fetchBrands();
    } catch { showToast("Failed to remove account", "error"); }
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border ${
              toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <p className="text-sm font-medium">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium text-white">🏷️ Brand Manager</h1>
          <p className="text-slate-500 mt-1">Create brands and map Meta/Google ad accounts under each</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-2xl font-medium text-sm hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" /> Add Brand
        </button>
      </div>

      {/* Create Brand Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="p-7 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl space-y-5">
              <h2 className="text-lg font-medium text-slate-200">New Brand</h2>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Brand Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Digifyce, Client X"
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Industry</label>
                  <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium">
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Target ROAS</label>
                  <input type="number" value={form.target_roas} onChange={e => setForm({ ...form, target_roas: e.target.value })} step="0.1"
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Monthly Budget Cap (₹)</label>
                  <input type="number" value={form.monthly_budget_cap} onChange={e => setForm({ ...form, monthly_budget_cap: e.target.value })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Logo URL / Image</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://... or upload"
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium text-xs" />
                    <label className="px-4 py-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl cursor-pointer hover:bg-indigo-500/30 transition-all flex items-center justify-center font-medium text-sm whitespace-nowrap">
                      Browse
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const b64 = await toBase64(file);
                          setForm({ ...form, logo_url: b64 });
                        }
                      }} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Website URL</label>
                  <input type="url" value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://example.com"
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-3 block">Brand Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleCreateBrand}
                  className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-medium text-sm hover:bg-indigo-600 transition-all">
                  Create Brand
                </button>
                <button onClick={() => setShowCreate(false)}
                  className="px-8 py-3 border border-white/10 text-slate-400 rounded-xl font-medium text-sm hover:bg-white/5 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Brand Form */}
      <AnimatePresence>
        {showEdit && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="p-7 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl space-y-5">
              <h2 className="text-lg font-medium text-slate-200">Edit Brand</h2>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Brand Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Digifyce, Client X"
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Industry</label>
                  <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium">
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Target ROAS</label>
                  <input type="number" value={form.target_roas} onChange={e => setForm({ ...form, target_roas: e.target.value })} step="0.1"
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Monthly Budget Cap (₹)</label>
                  <input type="number" value={form.monthly_budget_cap} onChange={e => setForm({ ...form, monthly_budget_cap: e.target.value })}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Logo URL / Image</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://... or upload"
                      className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium text-xs" />
                    <label className="px-4 py-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl cursor-pointer hover:bg-indigo-500/30 transition-all flex items-center justify-center font-medium text-sm whitespace-nowrap">
                      Browse
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const b64 = await toBase64(file);
                          setForm({ ...form, logo_url: b64 });
                        }
                      }} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Website URL</label>
                  <input type="url" value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://example.com"
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-3 block">Brand Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm({ ...form, color: c })}
                      className={`w-8 h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "hover:scale-110"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleUpdateBrand}
                  className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-medium text-sm hover:bg-indigo-600 transition-all">
                  Update Brand
                </button>
                <button onClick={() => setShowEdit(false)}
                  className="px-8 py-3 border border-white/10 text-slate-400 rounded-xl font-medium text-sm hover:bg-white/5 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brands List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">Loading brands from Supabase...</div>
      ) : brands.length === 0 ? (
        <div className="py-24 border border-dashed border-white/5 rounded-3xl flex flex-col items-center text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="font-medium">No brands yet</p>
          <p className="text-sm mt-1">Click "Add Brand" to create your first brand</p>
        </div>
      ) : (
        <div className="space-y-4">
          {brands.map((brand: any) => (
            <div key={brand.id} className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
              {/* Brand Header Row */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-medium text-lg shadow-lg overflow-hidden shrink-0"
                    style={{ backgroundColor: brand.color }}>
                    {brand.logo_url ? <img src={brand.logo_url} className="w-full h-full object-cover" alt={brand.name} /> : brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-medium text-white">{brand.name}</h3>
                      {brand.website_url && (
                        <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-400 transition-colors">
                          <Link2 className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {brand.industry} · Target ROAS: <span className="text-indigo-400 font-medium">{brand.target_roas}x</span> · 
                      {brand.accounts?.length || 0} account{brand.accounts?.length !== 1 ? "s" : ""} mapped
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setExpandedBrand(expandedBrand === brand.id ? null : brand.id)}
                    className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-white/5 transition-all font-medium">
                    <Link2 className="w-4 h-4" />
                    Manage Accounts
                    {expandedBrand === brand.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button onClick={() => { setShowEdit(true); setEditingBrand(brand); setForm(brand); }}
                    className="p-2 border border-indigo-500/20 text-indigo-500 rounded-xl hover:bg-indigo-500/10 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L19 7 17 5l1.375-2.375z"></path></svg>
                  </button>
                  <button onClick={() => handleDeleteBrand(brand.id, brand.name)}
                    className="p-2 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded: Account Mapping */}
              <AnimatePresence>
                {expandedBrand === brand.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-6 pb-6 border-t border-white/5 pt-5 space-y-5">
                      {/* Existing Accounts */}
                      {brand.accounts?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-3">Mapped Accounts</p>
                          {brand.accounts.map((acct: any) => (
                            <div key={acct.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg">{acct.platform}</span>
                                <div>
                                  <p className="font-medium text-slate-200 text-sm">{acct.account_name || `Account ${acct.account_id}`}</p>
                                  <p className="text-xs font-mono text-slate-500">act_{acct.account_id}</p>
                                </div>
                              </div>
                              <button onClick={() => handleRemoveAccount(acct.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">No accounts mapped yet.</p>
                      )}

                      {/* Add Account Form */}
                      <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-4">
                        <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">+ Map New Account</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5 block">Platform</label>
                            <select value={accountForm.platform}
                              onChange={e => setAccountForm({ ...accountForm, platform: e.target.value })}
                              className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-indigo-500">
                              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5 block">Account ID *</label>
                            <input placeholder="e.g. 123456789"
                              value={accountForm.account_id}
                              onChange={e => setAccountForm({ ...accountForm, account_id: e.target.value })}
                              className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5 block">Account Label</label>
                            <input placeholder="e.g. Main Performance"
                              value={accountForm.account_name}
                              onChange={e => setAccountForm({ ...accountForm, account_name: e.target.value })}
                              className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder-slate-700 focus:outline-none focus:border-indigo-500" />
                          </div>
                        </div>
                        <button onClick={() => handleMapAccount(brand.id)}
                          className="w-full py-2.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl font-medium text-sm hover:bg-indigo-500/30 transition-all">
                          Map Account to {brand.name}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
