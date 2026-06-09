import { useEffect, useState } from "react";
import { api, getToken, API_BASE } from "../lib/api";
import { SkeletonCards } from "../components/Skeleton";
import { showToast } from "../components/Toast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Sale {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  receipt_number: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

type Tab = "pos" | "products" | "history";

export default function POS() {
  const [tab, setTab] = useState<Tab>("pos");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: "", description: "", price: "" });
  const [saving, setSaving] = useState(false);

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [processing, setProcessing] = useState(false);

  // Sales history
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

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

  const loadSales = async () => {
    const token = getToken();
    if (!token) return;
    setLoadingSales(true);
    try {
      const data = await api("/api/pos/sales", { token });
      setSales(data);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { if (tab === "history") loadSales(); }, [tab]);

  // Product CRUD
  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = getToken()!;
    try {
      if (editingProduct) {
        await api(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          token,
          body: { name: productForm.name, description: productForm.description, price: parseInt(productForm.price) },
        });
        showToast("Product updated", "success");
      } else {
        await api("/api/products", {
          method: "POST",
          token,
          body: { name: productForm.name, description: productForm.description, price: parseInt(productForm.price) },
        });
        showToast("Product created", "success");
      }
      setProductForm({ name: "", description: "", price: "" });
      setEditingProduct(null);
      setShowProductForm(false);
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

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
    }
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  // Checkout
  const processSale = async () => {
    if (!customerPhone) {
      showToast("Customer phone is required", "error");
      return;
    }
    setProcessing(true);
    try {
      const token = getToken()!;
      const sale = await api("/api/pos/sales", {
        method: "POST",
        token,
        body: {
          items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
          customer_name: customerName,
          customer_phone: customerPhone,
          payment_method: paymentMethod,
        },
      });

      // Initiate payment
      await api(`/api/pos/sales/${sale.id}/charge`, { method: "POST", token });

      showToast("Sale created! Payment request sent to customer.", "success");
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setShowCheckout(false);
      setTab("history");
      loadSales();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const downloadReceipt = async (saleId: string) => {
    const token = getToken()!;
    window.open(`${API_BASE}/api/pos/sales/${saleId}/receipt-pdf?token=${token}`, "_blank");
  };

  const sendReceipt = async (saleId: string, channel: string) => {
    try {
      await api(`/api/pos/sales/${saleId}/send-receipt?channel=${channel}`, { method: "POST", token: getToken()! });
      showToast(`Receipt sent via ${channel}`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Point of Sale</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {([
          { key: "pos", label: "New Sale", icon: "🛒" },
          { key: "products", label: "Products", icon: "📦" },
          { key: "history", label: "Sales History", icon: "📋" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-white shadow-sm text-primary-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* POS Tab */}
      {tab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product grid */}
          <div className="lg:col-span-2">
            <h2 className="font-semibold mb-3">Select Products</h2>
            {loading ? (
              <SkeletonCards count={6} />
            ) : products.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📦</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">No products yet</h3>
                <p className="text-gray-500 text-sm mb-4">Add products first to start making sales.</p>
                <button onClick={() => setTab("products")} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
                  Add Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {products.filter((p) => p.is_active).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition text-left"
                  >
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-lg font-bold text-primary-600 mt-1">{product.price.toLocaleString()} <span className="text-xs font-normal text-gray-400">XAF</span></p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit sticky top-4">
            <h2 className="font-semibold mb-3">Cart ({cart.length})</h2>

            {cart.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Click products to add to cart</p>
            ) : (
              <>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-gray-400">{item.product.price.toLocaleString()} XAF each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center">-</button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center">+</button>
                        <span className="w-20 text-right text-sm font-medium">{(item.product.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 mb-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{cartTotal.toLocaleString()} XAF</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 transition"
                >
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-4">Complete Sale</h3>

            <div className="space-y-3 mb-4">
              <input
                placeholder="Customer Name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                placeholder="Customer Phone (237...)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setPaymentMethod("momo")}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition ${
                    paymentMethod === "momo" ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-gray-200"
                  }`}
                >
                  MTN MoMo
                </button>
                <button
                  onClick={() => setPaymentMethod("orange")}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition ${
                    paymentMethod === "orange" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-gray-200"
                  }`}
                >
                  Orange Money
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500">Total to charge:</p>
              <p className="text-2xl font-bold">{cartTotal.toLocaleString()} XAF</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCheckout(false)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={processSale}
                disabled={processing || !customerPhone}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {processing ? "Processing..." : "Charge Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === "products" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Your Products</h2>
            <button
              onClick={() => { setShowProductForm(true); setEditingProduct(null); setProductForm({ name: "", description: "", price: "" }); }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              + Add Product
            </button>
          </div>

          {showProductForm && (
            <form onSubmit={saveProduct} className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
              <h3 className="font-semibold mb-4">{editingProduct ? "Edit Product" : "New Product"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Product Name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                <input placeholder="Price (XAF)" type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                <input placeholder="Description (optional)" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 col-span-2" />
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={saving} className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  {saving ? "Saving..." : editingProduct ? "Update" : "Create"}
                </button>
                <button type="button" onClick={() => { setShowProductForm(false); setEditingProduct(null); }} className="px-6 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              </div>
            </form>
          )}

          {loading ? (
            <SkeletonCards count={6} />
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No products yet</h3>
              <p className="text-gray-500 text-sm mb-4">Add your first product to start selling.</p>
              <button onClick={() => setShowProductForm(true)} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
                Add Your First Product
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500 bg-gray-50">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium">Price</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium">{product.name}</td>
                      <td className="p-4 text-sm text-gray-500">{product.description || "—"}</td>
                      <td className="p-4 font-medium">{product.price.toLocaleString()} XAF</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingProduct(product); setProductForm({ name: product.name, description: product.description || "", price: String(product.price) }); setShowProductForm(true); }} className="text-xs text-primary-600 hover:underline">Edit</button>
                          <button onClick={() => deleteProduct(product.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div>
          <h2 className="font-semibold mb-4">Sales History</h2>
          {loadingSales ? (
            <SkeletonCards count={4} />
          ) : sales.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No sales yet</h3>
              <p className="text-gray-500 text-sm">Sales will appear here after your first transaction.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div key={sale.id} className="bg-white p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{sale.customer_name || "Customer"}</p>
                        <span className="text-xs text-gray-400">{sale.customer_phone}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          sale.payment_status === "completed" ? "bg-green-100 text-green-700" :
                          sale.payment_status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {sale.payment_status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {sale.items.map((i) => `${i.product_name} x${i.quantity}`).join(", ")}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Receipt: {sale.receipt_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{sale.total_amount.toLocaleString()} XAF</p>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => downloadReceipt(sale.id)} className="text-xs text-primary-600 hover:underline">Download PDF</button>
                        <button onClick={() => sendReceipt(sale.id, "whatsapp")} className="text-xs text-green-600 hover:underline">Send WhatsApp</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
