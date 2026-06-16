import { useEffect, useState } from "react";
import { api, getToken, API_BASE } from "../lib/api";
import { showToast } from "../components/Toast";
import {
  ShoppingBag,
  Box,
  Search,
  Plus,
  Smartphone,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Phone,
  CreditCard,
  X,
  Loader2,
  Download
} from "lucide-react";

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
  customPrice?: number;
}

const inputCls = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition placeholder:text-gray-400";

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [processing, setProcessing] = useState(false);

  // Payment status tracking modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusError, setStatusError] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);

  // Receipt details
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  
  // Search state
  const [searchProduct, setSearchProduct] = useState("");

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

  const updateCartPrice = (productId: string, price: number) => {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, customPrice: price } : i));
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.customPrice !== undefined ? i.customPrice : i.product.price) * i.quantity, 0);

  // Checkout
  const processSale = async () => {
    if (!customerPhone) {
      showToast("Customer phone is required", "error");
      return;
    }
    setProcessing(true);
    setShowCheckout(false);

    // Open verification modal
    setShowStatusModal(true);
    setStatusText("Creating your sale record...");
    setStatusError("");
    setPaymentDone(false);

    try {
      const token = getToken()!;
      const sale = await api("/api/pos/sales", {
        method: "POST",
        token,
        body: {
          items: cart.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            price: i.customPrice !== undefined ? i.customPrice : i.product.price
          })),
          customer_name: customerName,
          customer_phone: customerPhone,
          payment_method: paymentMethod,
        },
      });

      setStatusText("Initiating Mobile Money push notification...");
      const chargeRes = await api(`/api/pos/sales/${sale.id}/charge`, { method: "POST", token });

      // Clean cart and inputs
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");

      // If status is completed immediately (e.g. Demo Mode Auto-Complete)
      if (chargeRes.status === "completed") {
        setPaymentDone(true);
        setReceiptSaleId(sale.id);
        setStatusText("Payment confirmed!");
        return;
      }

      // Real payment: start polling
      setStatusText(`A validation request has been sent to the phone. Please enter your Mobile Money PIN code on the screen.`);

      let attempts = 0;
      const maxAttempts = 30; // 60 seconds (2s interval)
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(interval);
          setStatusError("Payment verification timed out. Please verify on the client's phone or try again.");
          return;
        }

        try {
          const checkRes = await api(`/api/pos/sales/${sale.id}/receipt`, { token });
          const status = checkRes.sale?.payment_status;

          if (status === "completed") {
            clearInterval(interval);
            setPaymentDone(true);
            setReceiptSaleId(sale.id);
            setStatusText("Payment verified successfully!");
          } else if (status === "failed") {
            clearInterval(interval);
            setStatusError("Payment was rejected or failed. Please check the customer's balance/PIN and try again.");
          }
        } catch (pollErr) {
          // Ignore network errors during polling
        }
      }, 2000);

    } catch (e: any) {
      setShowStatusModal(false);
      showToast(e.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase()) || (p.description || "").toLowerCase().includes(searchProduct.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-sm text-gray-400 mt-0.5">Collect instant mobile payments in-person</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Products selection panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-gray-900">Select Products</h2>
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 w-64 shadow-sm">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                className="text-sm bg-transparent outline-none placeholder:text-gray-400 w-full"
                placeholder="Filter products..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Box className="w-7 h-7 text-[#8B5CF6]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{searchProduct ? "No products found" : "No products yet"}</h3>
              <p className="text-gray-400 text-sm">
                {searchProduct ? "Try a different search query." : "No active products available for checkout."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.filter((p) => p.is_active).map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white p-5 rounded-2xl border border-gray-100 hover:border-[#8B5CF6] hover:shadow-md transition duration-200 text-left flex flex-col justify-between h-28 group relative overflow-hidden shadow-sm"
                >
                  <div>
                    <p className="font-bold text-gray-900 text-sm group-hover:text-[#8B5CF6] transition">{product.name}</p>
                    {product.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{product.description}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-base font-bold text-[#8B5CF6]">{product.price.toLocaleString()} <span className="text-[10px] font-semibold text-gray-400">XAF</span></p>
                    <span className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                      <Plus className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-950">Cart Items ({cart.length})</h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-red-500 font-semibold hover:bg-red-50 px-2 py-1 rounded-lg transition">
                Clear All
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-xs font-medium">Your cart is empty</p>
              <p className="text-[11px]">Click products on the left to add them</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {cart.map((item) => {
                  const priceVal = item.customPrice !== undefined ? item.customPrice : item.product.price;
                  return (
                    <div key={item.product.id} className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">{item.product.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Original: {item.product.price.toLocaleString()} XAF</p>
                        </div>
                        <button
                          onClick={() => updateCartQty(item.product.id, 0)}
                          className="text-gray-300 hover:text-red-500 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100/50">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Price:</span>
                          <input
                            type="number"
                            value={priceVal === 0 ? "" : priceVal}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              updateCartPrice(item.product.id, val);
                            }}
                            className="w-[70px] px-1.5 py-0.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8B5CF6] focus:border-[#8B5CF6] bg-white"
                          />
                          <span className="text-[9px] text-gray-400 font-semibold">XAF</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 font-bold text-xs">-</button>
                            <span className="px-2 text-center text-xs font-bold text-gray-700 min-w-[20px]">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 font-bold text-xs">+</button>
                          </div>
                          <span className="text-xs font-bold text-[#8B5CF6]">{(priceVal * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-gray-400 uppercase">Subtotal</span>
                  <span className="text-2xl font-extrabold text-gray-900">{cartTotal.toLocaleString()} <span className="text-xs font-semibold text-gray-400">XAF</span></span>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-[#8B5CF6] text-white py-3.5 rounded-xl font-bold hover:bg-purple-600 transition shadow-lg shadow-purple-100 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-950 text-lg">Complete Customer Charge</h3>
              <button onClick={() => setShowCheckout(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1.5">Customer Name (Optional)</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1.5">Customer Phone (MTN or Orange)</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="237650000000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={`${inputCls} pl-10`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1.5">Payment Method</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentMethod("momo")}
                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition flex items-center justify-center gap-2 ${
                      paymentMethod === "momo" ? "border-yellow-400 bg-yellow-50 text-yellow-800" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-yellow-600" />
                    MTN MoMo
                  </button>
                  <button
                    onClick={() => setPaymentMethod("orange")}
                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition flex items-center justify-center gap-2 ${
                      paymentMethod === "orange" ? "border-orange-400 bg-orange-50 text-orange-800" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-orange-600" />
                    Orange Money
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Amount Due</p>
                <p className="text-2xl font-extrabold text-gray-900">{cartTotal.toLocaleString()} <span className="text-sm font-semibold text-gray-400">XAF</span></p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-500">
                MoMo Push API
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCheckout(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={processSale}
                disabled={processing || !customerPhone}
                className="flex-1 py-2.5 rounded-xl bg-[#8B5CF6] text-white font-bold hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
              >
                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                {processing ? "Processing..." : "Charge Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl text-center border border-gray-100 space-y-6">
            <h3 className="font-bold text-xl text-gray-900">Mobile Money Payment</h3>

            <div className="flex flex-col items-center justify-center py-4">
              {paymentDone ? (
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-500 animate-bounce shadow-inner">
                  <CheckCircle className="w-10 h-10" />
                </div>
              ) : statusError ? (
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 animate-pulse shadow-inner">
                  <XCircle className="w-10 h-10" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-100 border-t-[#8B5CF6]"></div>
                  <Smartphone className="absolute w-8 h-8 text-[#8B5CF6]" />
                </div>
              )}

              <p className={`mt-6 text-sm font-bold leading-relaxed px-4 ${
                statusError ? "text-red-500" : paymentDone ? "text-emerald-600 font-extrabold" : "text-gray-600"
              }`}>
                {statusText || (statusError ? statusError : "Waiting for authorization...")}
              </p>
            </div>

            {statusError ? (
              <div className="pt-2">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition"
                >
                  Close
                </button>
              </div>
            ) : paymentDone ? (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => window.open(`${API_BASE}/api/pos/sales/${receiptSaleId}/receipt-pdf?token=${getToken()}`, "_blank")}
                  className="w-full py-3.5 rounded-xl bg-[#8B5CF6] hover:bg-purple-600 text-white font-bold transition shadow-lg shadow-purple-100 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Receipt PDF
                </button>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition"
                >
                  Back to POS
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 font-medium pt-2">
                Do not reload this page. Polling payment status automatically...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
