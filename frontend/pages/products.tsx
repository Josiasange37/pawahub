import { useEffect, useState } from "react";
import { api, getToken } from "../lib/api";
import { showToast } from "../components/Toast";
import { Box, Search, Plus, Trash2, Edit2, Loader2, Info } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock?: number;
  is_active: boolean;
  created_at: string;
}

const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition placeholder:text-gray-400";

function StockBadge({ stock }: { stock?: number }) {
  const s = stock ?? 0;
  if (s <= 0) {
    return <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">Out of Stock</span>;
  }
  if (s <= 10) {
    return <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">Low Stock ({s})</span>;
  }
  return <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">{s} in stock</span>;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", stock: "0" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const loadProducts = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api("/api/products", { token });
      setProducts(data);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = getToken()!;
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseInt(form.price),
        stock: parseInt(form.stock) || 0
      };

      if (editingProduct) {
        await api(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        showToast("Product updated", "success");
      } else {
        await api("/api/products", {
          method: "POST",
          token,
          body: payload,
        });
        showToast("Product created", "success");
      }
      setForm({ name: "", description: "", price: "", stock: "0" });
      setEditingProduct(null);
      setShowForm(false);
      loadProducts();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api(`/api/products/${id}`, { method: "DELETE", token: getToken()! });
      showToast("Product deleted", "success");
      loadProducts();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Manage your shop inventory items and stock levels</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingProduct(null); setForm({ name: "", description: "", price: "", stock: "0" }); }}
          className="bg-[#8B5CF6] text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-purple-600 shadow-md shadow-purple-100 flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">{editingProduct ? "Edit Product" : "New Inventory Product"}</h3>
          <form onSubmit={saveProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Product Name</label>
                <input className={inputCls} placeholder="e.g. Premium Coffee" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Price (XAF)</label>
                <input className={inputCls} type="number" placeholder="e.g. 1500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Items In Stock</label>
                <input className={inputCls} type="number" placeholder="e.g. 50" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                <input className={inputCls} placeholder="Short item description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#8B5CF6] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : editingProduct ? "Update Product" : "Create Product"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingProduct(null); }} className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Your Inventory</h2>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              className="text-xs sm:text-sm bg-transparent outline-none placeholder:text-gray-400 flex-1 min-w-0"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-6 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Box className="w-7 h-7 text-[#8B5CF6]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{search ? "No matching products" : "No products added"}</h3>
            <p className="text-gray-400 text-sm mb-5">Start cataloging your items to make in-person MoMo checkout faster.</p>
            {!search && (
              <button onClick={() => setShowForm(true)} className="bg-[#8B5CF6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-600 transition shadow-md">
                Create First Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-semibold border-b border-gray-100">
                  <th className="text-left px-2 sm:px-3 py-3">Item Name</th>
                  <th className="text-left px-2 sm:px-3 py-3 hidden md:table-cell">Description</th>
                  <th className="text-left px-2 sm:px-3 py-3">Unit Price</th>
                  <th className="text-left px-2 sm:px-3 py-3 hidden lg:table-cell">Stock Level</th>
                  <th className="text-right px-3 sm:px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-2 sm:px-3 py-3.5 text-xs sm:text-sm font-semibold text-gray-800">{product.name}</td>
                    <td className="px-2 sm:px-3 py-3.5 text-gray-400 text-xs hidden md:table-cell">{product.description || "—"}</td>
                    <td className="px-2 sm:px-3 py-3.5 text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">{product.price.toLocaleString()} XAF</td>
                    <td className="px-2 sm:px-3 py-3.5 hidden lg:table-cell">
                      <StockBadge stock={product.stock} />
                    </td>
                    <td className="px-3 sm:px-6 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => { setEditingProduct(product); setForm({ name: product.name, description: product.description || "", price: String(product.price), stock: String(product.stock || 0) }); setShowForm(true); }}
                          className="p-1.5 text-gray-400 hover:text-[#8B5CF6] hover:bg-purple-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
