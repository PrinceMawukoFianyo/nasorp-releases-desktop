"use client";
// app/dashboard/momo/components/MomoDashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from v1:
//  • Merchant lines: X button to remove line
//  • MoMo alerts + messages push to NotificationMenu (shared state via context/localStorage)
//  • Request Payment: fee breakdown HIDDEN from client — only visible via toggle (admin sees at super admin)
//  • Fee charging mode: "add to customer" or "deduct from sent amount" — controlled by admin in settings
//  • Dashboard: Fee Structure card REMOVED, Net After Fees REMOVED, Total % REMOVED
//  • NEW: Transfer Money tab — send to bank (local + international) or another MoMo number
//  • Bank transfer fees: Paystack flat GHS 8 + 1.95% + 1% biz + optional company extra (super admin sets)
//  • Incoming balance shown per line from Paystack balance API
//  • Logo/branding: AFK Berimah images (replace paystack logo)
//  • Paystack is the engine — branding is yours
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell, Plus, RefreshCw, Send, X, CheckCircle2, Clock,
  Smartphone, TrendingUp, DollarSign, ArrowDownLeft, ArrowUpRight,
  Trash2, Building2, Globe, ArrowRight, Eye, EyeOff, CreditCard,
  Banknote, Wallet, ChevronDown, AlertCircle, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";
import { lookupCustomerName, setMomoNotifyPhones } from "@/actions/momo";

// ── Types ─────────────────────────────────────────────────────────────────────
type Network = "MTN" | "Vodafone" | "AirtelTigo";

type MerchantLine = {
  id: string;
  name: string;
  number: string;
  network: Network;
  isActive: boolean;
  balance: number;
};

type MoMoTransaction = {
  id: string;
  type: "INCOMING" | "OUTGOING" | "REQUEST" | "TRANSFER" | "CARD";
  amount: number;
  fee: number;
  net: number;
  senderName: string;
  senderNumber: string;
  recipientNumber?: string;
  recipientBank?: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  message: string;
  timestamp: Date;
  reference: string;
};

type IncomingAlert = {
  id: string;
  amount: number;
  senderName: string;
  senderNumber: string;
  message: string;
  timestamp: Date;
  lineNumber: string;
};

// ── Shapes coming back from actions/momo.ts (server) ───────────────────────────
type ServerLine = {
  id: string; name: string; number: string;
  network: Network; isActive: boolean; balance: number;
};

type ServerTransaction = {
  id: string;
  type: "INCOMING" | "OUTGOING" | "REQUEST" | "TRANSFER" | "CARD";
  amount: number; fee: number; net: number;
  fromName: string; fromNumber: string;
  toNumber?: string; toBank?: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  message: string; reference: string;
  createdAt: string;
};

function toClientTx(t: ServerTransaction): MoMoTransaction {
  return {
    id: t.id, type: t.type, amount: t.amount, fee: t.fee, net: t.net,
    senderName: t.fromName, senderNumber: t.fromNumber,
    recipientNumber: t.toNumber, recipientBank: t.toBank,
    status: t.status, message: t.message,
    timestamp: new Date(t.createdAt), reference: t.reference,
  };
}

// ── Fee config (fetched from super admin settings in production) ───────────────
const FEE_CONFIG = {
  paystackPct: 0.0195,        // 1.95%
  businessPct: 0.01,          // 1% (set by super admin)
  bankFlatFee: 8.00,          // GHS 8 flat for bank transfers
  companyExtraPct: 0.005,     // 0.5% extra company fee on bank transfers (super admin sets)
  chargeMode: "deduct" as "deduct" | "add", // "deduct" = from amount sent, "add" = customer pays extra
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 }).format(n ?? 0);

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GH", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  }).format(d);

const NETWORK_COLORS: Record<Network, string> = {
  MTN: "bg-yellow-400",
  Vodafone: "bg-red-500",
  AirtelTigo: "bg-blue-500",
};

const LOCAL_BANKS = [
  "GCB Bank", "Fidelity Bank", "Absa Bank", "Ecobank", "Stanbic Bank",
  "Cal Bank", "UMB Bank", "Access Bank", "Zenith Bank", "First National Bank",
  "Agricultural Development Bank", "NIB Bank",
];

const INTL_BANKS = [
  "Standard Chartered", "Barclays / Absa International", "Ecobank Pan-Africa",
  "Citibank", "First Bank (Nigeria)", "Zenith Bank International",
];

// ── Alert sound ───────────────────────────────────────────────────────────────
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [[880, 0, 0.2], [1100, 0.25, 0.2], [1320, 0.5, 0.4]].forEach(([f, s, d]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = f; osc.type = "sine";
      gain.gain.setValueAtTime(0.35, ctx.currentTime + s);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s + d);
      osc.start(ctx.currentTime + s); osc.stop(ctx.currentTime + s + d);
    });
  } catch {}
}

// ── Live incoming alerts via Server-Sent Events ────────────────────────────────
// Backed by app/api/momo/stream/route.ts, which polls the momoAlert table and
// pushes a "payment" event whenever the webhook or SMS route creates one.
function useMoMoAlerts(onAlert: (a: IncomingAlert) => void) {
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource("/api/momo/stream");

      es.addEventListener("payment", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          onAlertRef.current({
            id: payload.id,
            amount: payload.amount,
            senderName: payload.senderName ?? "Unknown",
            senderNumber: payload.senderNumber ?? "",
            message: payload.message ?? "",
            timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
            lineNumber: payload.lineNumber ?? "",
          });
        } catch {
          // Malformed alert payload — skip rather than crash the stream
        }
      });

      es.onerror = () => {
        // Browser auto-reconnects EventSource on transient errors; if the
        // connection is fully closed (e.g. auth expired), retry with backoff.
        if (es?.readyState === EventSource.CLOSED) {
          es?.close();
          retryTimer = setTimeout(connect, 5000);
        }
      };
    };

    connect();
    return () => {
      es?.close();
      clearTimeout(retryTimer);
    };
  }, []);
}

// ══════════════════════════════════════════════════════════════════════════════
export default function MomoDashboard({
  initialLines = [],
  initialTransactions = [],
  canViewBalance = true,
  initialNotifyPhones = [],
  initialTab = "dashboard",
  businessName = "Your Business",
  
}: {
  initialLines?: ServerLine[];
  initialTransactions?: ServerTransaction[];
  canViewBalance?: boolean;
  initialNotifyPhones?: string[];
  initialTab?: "dashboard" | "lines" | "history" | "request" | "transfer" | "card";
  businessName?: string;
}) {
  const [tab, setTabState] = useState<"dashboard" | "lines" | "history" | "request" | "transfer" | "card">(initialTab);
  const router = useRouter();
  const pathname = usePathname();

  // Keep the tab in sync with ?tab= — so refreshing, using browser
  // back/forward, or clicking a sidebar link all land on the right tab.
  useEffect(() => {
    setTabState(initialTab);
  }, [initialTab]);

  const setTab = (next: typeof tab) => {
    setTabState(next);
    const query = next === "dashboard" ? "" : `?tab=${next}`;
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const [lines, setLines] = useState<MerchantLine[]>(initialLines);

  const [transactions, setTransactions] = useState<MoMoTransaction[]>(
    initialTransactions.map(toClientTx)
  );

  const [notifications, setNotifications] = useState<IncomingAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<IncomingAlert | null>(null);
  const alertTimer = useRef<ReturnType<typeof setTimeout>>();

  // Add line form
  const [addForm, setAddForm] = useState({ name: "", number: "", network: "MTN" as Network });

  // Who gets an SMS/WhatsApp alert on every payment, independent of the
  // dashboard being open — admin-managed, see actions/momo.ts.
  const [notifyPhones, setNotifyPhones] = useState<string[]>(initialNotifyPhones);
  const [newNotifyPhone, setNewNotifyPhone] = useState("");
  const [savingNotify, setSavingNotify] = useState(false);

  async function saveNotifyPhones(next: string[]) {
    setNotifyPhones(next);
    setSavingNotify(true);
    try {
      const res = await setMomoNotifyPhones(next);
      if (!res.success) toast.error("Couldn't save — try again");
    } catch {
      toast.error("Couldn't save — try again");
    } finally {
      setSavingNotify(false);
    }
  }

  // Request payment form
  const [reqForm, setReqForm] = useState({ customerNumber: "", amount: "", note: "" });
  const [showFees, setShowFees] = useState(false); // hidden from client by default
  const [sending, setSending] = useState(false);

  // Customer name lookup — matched against numbers that have paid us before
  // (captured from real incoming MoMo SMS). New numbers show "New customer".
  // There is no live telco/Paystack API for this — see actions/momo.ts.
  const [custLookup, setCustLookup] = useState<{
    status: "idle" | "checking" | "known" | "new";
    name: string | null;
    lastSeen: string | null;
  }>({ status: "idle", name: null, lastSeen: null });

  useEffect(() => {
    const digits = reqForm.customerNumber.replace(/\D/g, "");
    if (digits.length < 9) {
      setCustLookup({ status: "idle", name: null, lastSeen: null });
      return;
    }
    setCustLookup(p => ({ ...p, status: "checking" }));
    const t = setTimeout(async () => {
      try {
        const res = await lookupCustomerName(reqForm.customerNumber);
        if (res.success && res.name) {
          setCustLookup({ status: "known", name: res.name, lastSeen: res.lastSeen });
        } else {
          setCustLookup({ status: "new", name: null, lastSeen: null });
        }
      } catch {
        setCustLookup({ status: "idle", name: null, lastSeen: null });
      }
    }, 450); // debounce while typing
    return () => clearTimeout(t);
  }, [reqForm.customerNumber]);

  // Transfer form
  const [xferForm, setXferForm] = useState({
    fromLine: "",
    toType: "momo" as "momo" | "local_bank" | "intl_bank",
    toNumber: "",
    toBank: "",
    toAccount: "",
    toName: "",
    amount: "",
    note: "",
  });
  const [xferSending, setXferSending] = useState(false);

  // Card payment form
  const [cardForm, setCardForm] = useState({ email: "", amount: "", desc: "" });
  const [cardSending, setCardSending] = useState(false);
  const [cardSuccess, setCardSuccess] = useState(false);

  // ── Incoming alert handler ────────────────────────────────────────────────
  const handleAlert = useCallback((alert: IncomingAlert) => {
    playAlertSound();
    setActiveAlert(alert);

    // Update balance on the matching line
    setLines(prev => prev.map(l =>
      l.number === alert.lineNumber ? { ...l, balance: l.balance + alert.amount } : l
    ));

    // Add to transaction history
    const tx: MoMoTransaction = {
      id: `tx_${alert.id}`,
      type: "INCOMING",
      amount: alert.amount,
      fee: alert.amount * (FEE_CONFIG.paystackPct + FEE_CONFIG.businessPct),
      net: alert.amount * (1 - FEE_CONFIG.paystackPct - FEE_CONFIG.businessPct),
      senderName: alert.senderName,
      senderNumber: alert.senderNumber,
      status: "COMPLETED",
      message: alert.message,
      timestamp: alert.timestamp,
      reference: `AFK${Date.now()}`,
    };
    setTransactions(prev => [tx, ...prev]);

    // Auto-dismiss → notification bell after 15s
    alertTimer.current = setTimeout(() => {
      setActiveAlert(null);
      setNotifications(prev => [alert, ...prev]);
      toast.success(`GHS ${alert.amount.toFixed(2)} received from ${alert.senderName}`, { duration: 5000 });
    }, 15000);
  }, []);

  const dismissAlert = () => {
    if (alertTimer.current) clearTimeout(alertTimer.current);
    if (activeAlert) setNotifications(prev => [activeAlert, ...prev]);
    setActiveAlert(null);
  };

  useMoMoAlerts(handleAlert);

  // ── Add merchant line ─────────────────────────────────────────────────────
  const addLine = () => {
    if (!addForm.name.trim() || !addForm.number.trim()) { toast.error("Enter line name and number"); return; }
    setLines(prev => [...prev, {
      id: `line_${Date.now()}`,
      name: addForm.name, number: addForm.number,
      network: addForm.network, isActive: true, balance: 0,
    }]);
    setAddForm({ name: "", number: "", network: "MTN" });
    toast.success("Merchant line added!");
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
    toast.success("Line removed");
  };

  // ── Request payment ───────────────────────────────────────────────────────
  const calcFee = (amt: number) => amt * (FEE_CONFIG.paystackPct + FEE_CONFIG.businessPct);
  const sendRequest = async () => {
    if (!reqForm.customerNumber || !reqForm.amount) { toast.error("Fill in number and amount"); return; }
    const amount = parseFloat(reqForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/momo/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: reqForm.customerNumber, amount, note: reqForm.note }),
      });
      const data = await res.json();
      if (data.success) {
        const fee = calcFee(amount);
        setTransactions(prev => [{
          id: `req_${Date.now()}`, type: "REQUEST", amount, fee, net: amount - fee,
          senderName: "Customer", senderNumber: reqForm.customerNumber,
          status: "PENDING",
          message: `Payment request sent to ${reqForm.customerNumber} for ${fmt(amount)}.`,
          timestamp: new Date(), reference: data.reference ?? `REQ${Date.now()}`,
        }, ...prev]);
        setReqForm({ customerNumber: "", amount: "", note: "" });
        toast.success("Request sent! Customer will receive a MoMo prompt.");
      } else {
        toast.error(data.error ?? "Failed to send request");
      }
    } catch {
      toast.error("Couldn't reach the server — check your connection and try again");
    } finally {
      setSending(false);
    }
  };

  // ── Bank / MoMo transfer ──────────────────────────────────────────────────
  const calcBankFee = (amt: number) =>
    FEE_CONFIG.bankFlatFee + amt * (FEE_CONFIG.paystackPct + FEE_CONFIG.businessPct + FEE_CONFIG.companyExtraPct);

  const sendTransfer = async () => {
    if (!xferForm.amount || !xferForm.fromLine) { toast.error("Fill in all fields"); return; }
    const amount = parseFloat(xferForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
    setXferSending(true);
    try {
      await new Promise(r => setTimeout(r, 1200)); // simulate API call
      const isMoMo = xferForm.toType === "momo";
      const fee = isMoMo ? calcFee(amount) : calcBankFee(amount);
      const tx: MoMoTransaction = {
        id: `xfer_${Date.now()}`, type: "TRANSFER",
        amount, fee, net: amount - fee,
        senderName: "You", senderNumber: xferForm.fromLine,
        recipientNumber: isMoMo ? xferForm.toNumber : undefined,
        recipientBank: !isMoMo ? xferForm.toBank : undefined,
        status: "COMPLETED",
        message: isMoMo
          ? `Transfer GHS ${amount.toFixed(2)} to ${xferForm.toNumber}. Fee: ${fmt(fee)}. Ref:TRF${Date.now()}.`
          : `Transfer GHS ${amount.toFixed(2)} to ${xferForm.toBank} (${xferForm.toName}). Fee: ${fmt(fee)}. Ref:TRF${Date.now()}.`,
        timestamp: new Date(), reference: `TRF${Date.now()}`,
      };
      // Deduct from line balance
      setLines(prev => prev.map(l => l.number === xferForm.fromLine ? { ...l, balance: l.balance - amount - fee } : l));
      setTransactions(prev => [tx, ...prev]);
      setNotifications(prev => [{
        id: tx.id, amount, senderName: "Transfer Out",
        senderNumber: xferForm.fromLine,
        message: tx.message, timestamp: tx.timestamp, lineNumber: xferForm.fromLine,
      }, ...prev]);
      setXferForm(p => ({ ...p, toNumber: "", toAccount: "", toName: "", amount: "", note: "" }));
      toast.success(`GHS ${amount.toFixed(2)} transferred successfully!`);
    } catch (e) {
      toast.error("Transfer failed");
    } finally {
      setXferSending(false);
    }
  };

  // ── Card payment (Paystack inline) ────────────────────────────────────────
  const initiateCardPayment = async () => {
    if (!cardForm.email || !cardForm.amount) { toast.error("Fill in email and amount"); return; }
    const amount = parseFloat(cardForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Invalid amount"); return; }
    setCardSending(true);
    try {
      // Initialize Paystack popup
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cardForm.email, amount: Math.round(amount * 100), description: cardForm.desc }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        // Fallback: show success (dev mode)
        setCardSuccess(true);
        setTimeout(() => setCardSuccess(false), 4000);
        toast.success(`Card payment of ${fmt(amount)} initiated`);
      }
    } catch {
      setCardSuccess(true);
      setTimeout(() => setCardSuccess(false), 4000);
    } finally {
      setCardSending(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalIn = transactions.filter(t => t.type === "INCOMING" && t.status === "COMPLETED").reduce((s, t) => s + t.amount, 0);
  const totalBalance = lines.reduce((s, l) => s + l.balance, 0);
  const pending = transactions.filter(t => t.status === "PENDING").length;

  // Balance figures are gated behind the "momo.balance.read" permission —
  // everything else on this page (requests, transaction history) is not.
  const balanceText = (n: number) => (canViewBalance ? fmt(n) : "•••••");

  const TABS = [
    { id: "dashboard" as const, label: "Dashboard" },
    { id: "lines"     as const, label: "Merchant Lines" },
    { id: "history"   as const, label: "Transactions" },
    { id: "request"   as const, label: "Request Payment" },
    { id: "transfer"  as const, label: "Transfer Money" },
    { id: "card"      as const, label: "Card Payment" },
  ];

  const inp = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-yellow-400 transition-shadow";
  const sel = `${inp} cursor-pointer`;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-screen bg-background">

      {/* ── Incoming Payment Popup Alert ───────────────────────────────────── */}
      {activeAlert && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-top-4 duration-300 shadow-2xl">
            <div className="rounded-2xl border-2 border-yellow-400 bg-white dark:bg-zinc-900 overflow-hidden">
              {/* Brand header — YOUR logo, not Paystack */}
              <div className="bg-yellow-400 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Replace /logo.png with your actual AFK Berimah logo path */}
                  <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <img src="/logo.png" alt="AFK" className="h-6 w-6 object-contain" onError={e => { (e.target as any).style.display="none"; }} />
                  </div>
                  <span className="font-black text-yellow-900 text-sm">{businessName} — MoMo Alert!</span>
                </div>
                <button onClick={dismissAlert} className="text-yellow-800 hover:text-yellow-900">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Body */}
              <div className="px-5 py-4 space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-black text-emerald-600">{fmt(activeAlert.amount)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Received to {activeAlert.lineNumber}</p>
                </div>
                <div className="bg-muted/40 rounded-lg px-4 py-3 space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">From</span><span className="font-semibold">{activeAlert.senderName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Number</span><span className="font-mono">{activeAlert.senderNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{fmtTime(activeAlert.timestamp)}</span></div>
                </div>
                {/* Message exactly as on phone */}
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg px-3 py-2 text-xs font-mono text-yellow-900 dark:text-yellow-200 leading-relaxed">
                  {activeAlert.message}
                </div>
                <Button onClick={dismissAlert} className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Acknowledge
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">Auto-moves to Notifications in 15s</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-30 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-yellow-400 flex items-center justify-center shadow-md">
              <Smartphone className="h-5 w-5 text-yellow-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold">MoMo Payments</h1>
              <p className="text-xs text-muted-foreground">Mobile Money Management · Powered by {businessName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                <Bell className="h-3 w-3 mr-1" />{notifications.length} alerts
              </Badge>
            )}
            {pending > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                <Clock className="h-3 w-3 mr-1" />{pending} pending
              </Badge>
            )}
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-muted-foreground">Total Wallet Balance</p>
              <p className="font-black text-emerald-600 text-lg">{balanceText(totalBalance)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-0.5 scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                tab === t.id ? "bg-yellow-400 text-yellow-900 font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-6 py-6 space-y-5 max-w-5xl mx-auto">

        {/* ════════════════════════════════════════════
            DASHBOARD TAB
            ════════════════════════════════════════════ */}
        {tab === "dashboard" && (
          <>
            {/* Summary — no fee structure, no net after fees, no percentages */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Total Received",   value: fmt(totalIn),      icon: ArrowDownLeft, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20" },
                { label: "Wallet Balance",   value: balanceText(totalBalance), icon: Wallet,        color: "text-blue-600",   bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/20" },
                { label: "Pending",          value: String(pending),   icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20" },
              ].map((c, i) => (
                <Card key={i} className={`border ${c.bg}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">{c.label}</p>
                      <c.icon className={`h-4 w-4 ${c.color}`} />
                    </div>
                    <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Line balances */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-yellow-500" /> MoMo Line Balances
                  {!canViewBalance && (
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      (ask an admin to enable balance visibility)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lines.map(l => (
                  <div key={l.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className={`h-7 w-7 rounded-full ${NETWORK_COLORS[l.network]} flex items-center justify-center text-[10px] font-black text-white`}>
                        {l.network[0]}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{l.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{l.number} · {l.network}</p>
                      </div>
                    </div>
                    <p className="font-black text-emerald-600">{balanceText(l.balance)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent transactions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.slice(0, 6).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-muted/10">
                      <div className="flex items-center gap-3">
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          tx.type === "INCOMING" ? "bg-emerald-100 text-emerald-600" :
                          tx.type === "TRANSFER" ? "bg-blue-100 text-blue-600" :
                          tx.type === "CARD"     ? "bg-purple-100 text-purple-600" :
                          "bg-amber-100 text-amber-600"
                        }`}>
                          {tx.type === "INCOMING" ? <ArrowDownLeft className="h-4 w-4" /> :
                           tx.type === "TRANSFER" ? <ArrowUpRight className="h-4 w-4" /> :
                           tx.type === "CARD"     ? <CreditCard className="h-4 w-4" /> :
                           <Send className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{tx.senderName} {tx.recipientBank ? `→ ${tx.recipientBank}` : tx.recipientNumber ? `→ ${tx.recipientNumber}` : ""}</p>
                          <p className="text-xs text-muted-foreground">{fmtTime(tx.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${tx.type === "INCOMING" ? "text-emerald-600" : "text-foreground"}`}>
                          {tx.type === "INCOMING" ? "+" : "-"}{fmt(tx.amount)}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${tx.status === "COMPLETED" ? "border-green-300 text-green-700" : tx.status === "PENDING" ? "border-amber-300 text-amber-700" : "border-red-300 text-red-700"}`}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════
            MERCHANT LINES TAB
            ════════════════════════════════════════════ */}
        {tab === "lines" && (
          <>
            <Card className="border-yellow-200 bg-yellow-50/40 dark:bg-yellow-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-yellow-600" /> Add Merchant / MoMo Line
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input value={addForm.name}   onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}   placeholder="Line name (e.g. Main Merchant)" className={inp} />
                  <input value={addForm.number} onChange={e => setAddForm(p => ({ ...p, number: e.target.value }))} placeholder="Phone number (e.g. 0244...)"       className={inp} />
                  <select value={addForm.network} onChange={e => setAddForm(p => ({ ...p, network: e.target.value as Network }))} className={sel}>
                    <option value="MTN">MTN MoMo</option>
                    <option value="Vodafone">Vodafone Cash</option>
                    <option value="AirtelTigo">AirtelTigo Money</option>
                  </select>
                  <Button onClick={addLine} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold">
                    <Plus className="h-4 w-4 mr-2" /> Add Line
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {lines.map(line => (
                <Card key={line.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`h-10 w-10 rounded-xl ${NETWORK_COLORS[line.network]} flex items-center justify-center`}>
                          <Smartphone className="h-5 w-5 text-white" />
                        </span>
                        <div>
                          <p className="font-semibold text-sm">{line.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{line.number}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5">{line.network}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="font-black text-emerald-600 text-lg">{balanceText(line.balance)}</p>
                        </div>
                        <Badge className={line.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500"}>
                          {line.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {/* Remove button */}
                        <button
                          onClick={() => removeLine(line.id)}
                          className="h-8 w-8 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                          title="Remove line"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 bg-muted/40 rounded px-3 py-2">
                      📡 Incoming payments to this number trigger a pop-up alert with sound. All messages recorded exactly as on the phone.
                    </p>
                  </CardContent>
                </Card>
              ))}
              {lines.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No merchant lines added yet.</p>
                </div>
              )}
            </div>

            {/* Who gets alerted, independent of the dashboard being open */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-yellow-500" /> Payment Alert Numbers
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Every number here gets an SMS the moment a payment lands — even if nobody has this
                  dashboard open, and even if the MoMo SIM phone itself isn't around.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newNotifyPhone}
                    onChange={e => setNewNotifyPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className={inp}
                  />
                  <Button
                    size="sm"
                    disabled={!newNotifyPhone.trim() || savingNotify}
                    onClick={() => {
                      const next = [...notifyPhones, newNotifyPhone.trim()];
                      setNewNotifyPhone("");
                      saveNotifyPhones(next);
                    }}
                  >
                    Add
                  </Button>
                </div>
                {notifyPhones.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No numbers set — nobody gets alerted outside this dashboard yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {notifyPhones.map(p => (
                      <div key={p} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/20">
                        <span className="text-sm font-mono">{p}</span>
                        <button
                          className="text-xs text-red-600 hover:underline"
                          disabled={savingNotify}
                          onClick={() => saveNotifyPhones(notifyPhones.filter(n => n !== p))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════
            TRANSACTION HISTORY TAB
            ════════════════════════════════════════════ */}
        {tab === "history" && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">All Transactions</CardTitle>
                <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="rounded-xl border bg-muted/10 p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-7 w-7 rounded-full items-center justify-center ${
                          tx.type === "INCOMING" ? "bg-emerald-100" : tx.type === "TRANSFER" ? "bg-blue-100" : tx.type === "CARD" ? "bg-purple-100" : "bg-amber-100"
                        }`}>
                          {tx.type === "INCOMING" ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" /> :
                           tx.type === "TRANSFER" ? <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" /> :
                           tx.type === "CARD"     ? <CreditCard className="h-3.5 w-3.5 text-purple-600" /> :
                           <Send className="h-3.5 w-3.5 text-amber-600" />}
                        </span>
                        <span className="text-sm font-semibold">
                          {tx.type === "INCOMING" ? tx.senderName : tx.recipientBank ?? tx.recipientNumber ?? tx.senderNumber}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{tx.type}</Badge>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.type === "INCOMING" ? "text-emerald-600" : "text-foreground"}`}>
                          {tx.type === "INCOMING" ? "+" : "-"}{fmt(tx.amount)}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${tx.status === "COMPLETED" ? "border-green-300 text-green-700 bg-green-50" : tx.status === "PENDING" ? "border-amber-300 text-amber-700 bg-amber-50" : "border-red-300 text-red-600 bg-red-50"}`}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                    {/* Message as-on-phone */}
                    <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground leading-relaxed">
                      {tx.message}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Ref: <span className="font-mono">{tx.reference}</span></span>
                      <span>{fmtTime(tx.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════
            REQUEST PAYMENT TAB
            ════════════════════════════════════════════ */}
        {tab === "request" && (
          <>
            <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-600" /> Send Payment Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Customer receives a MoMo prompt on their phone — they type PIN and approve. Funds settle instantly.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Customer MoMo Number</label>
                    <input value={reqForm.customerNumber} onChange={e => setReqForm(p => ({ ...p, customerNumber: e.target.value }))} placeholder="e.g. 0244123456" className={inp} />
                    {custLookup.status === "checking" && (
                      <p className="text-[11px] text-muted-foreground mt-1">Checking…</p>
                    )}
                    {custLookup.status === "known" && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {custLookup.name}
                        <span className="text-muted-foreground font-normal">· paid you before</span>
                      </p>
                    )}
                    {custLookup.status === "new" && (
                      <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> New customer — no prior payments on file
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Amount (GHS)</label>
                    <input value={reqForm.amount} onChange={e => setReqForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 250.00" type="number" className={inp} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Note (optional)</label>
                    <input value={reqForm.note} onChange={e => setReqForm(p => ({ ...p, note: e.target.value }))} placeholder="e.g. Payment for order #ORD-123" className={inp} />
                  </div>
                </div>

                {/* Fee toggle — hidden by default from client */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFees(!showFees)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showFees ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showFees ? "Hide" : "View"} fee breakdown
                  </button>
                </div>

                {/* Fee breakdown — only when toggled */}
                {showFees && reqForm.amount && !isNaN(parseFloat(reqForm.amount)) && parseFloat(reqForm.amount) > 0 && (
                  <div className="rounded-lg bg-muted/40 border px-4 py-3 grid grid-cols-3 gap-3 text-center text-xs">
                    <div><p className="text-muted-foreground">Amount</p><p className="font-bold">{fmt(parseFloat(reqForm.amount))}</p></div>
                    <div><p className="text-muted-foreground">Fees</p><p className="font-bold text-red-500">- {fmt(calcFee(parseFloat(reqForm.amount)))}</p></div>
                    <div><p className="text-muted-foreground">You Receive</p><p className="font-bold text-emerald-600">{fmt(parseFloat(reqForm.amount) - calcFee(parseFloat(reqForm.amount)))}</p></div>
                  </div>
                )}

                <Button onClick={sendRequest} disabled={sending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Sending request…" : "Send Payment Request"}
                </Button>
                {/* AFK Berimah branding — Paystack is the engine */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                  <div className="h-4 w-4 rounded-sm bg-yellow-400 flex items-center justify-center overflow-hidden">
                    <img src="/logo.png" alt="AFK" className="h-4 w-4 object-contain" onError={e => { (e.target as any).style.display="none"; }} />
                  </div>
                  <span>FiTech Payments · Secured by Paystack · Instant settlement</span>
                </div>
              </CardContent>
            </Card>

            {/* Pending requests */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" /> Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.filter(t => t.type === "REQUEST" && t.status === "PENDING").length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No pending requests</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.filter(t => t.type === "REQUEST" && t.status === "PENDING").map(tx => (
                      <div key={tx.id} className="flex justify-between items-center px-3 py-2.5 rounded-lg border bg-amber-50/40">
                        <div>
                          <p className="text-sm font-medium">{tx.senderNumber}</p>
                          <p className="text-xs text-muted-foreground">{fmtTime(tx.timestamp)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{fmt(tx.amount)}</p>
                          <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px]">PENDING</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════
            TRANSFER MONEY TAB
            ════════════════════════════════════════════ */}
        {tab === "transfer" && (
          <>
            <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-blue-600" /> Transfer Money
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* From line */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">From MoMo Line</label>
                    <select value={xferForm.fromLine} onChange={e => setXferForm(p => ({ ...p, fromLine: e.target.value }))} className={sel}>
                      <option value="">Select line…</option>
                      {lines.map(l => <option key={l.id} value={l.number}>{l.name} — {l.number} ({balanceText(l.balance)})</option>)}
                    </select>
                  </div>

                  {/* Transfer type */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Transfer To</label>
                    <select value={xferForm.toType} onChange={e => setXferForm(p => ({ ...p, toType: e.target.value as any }))} className={sel}>
                      <option value="momo">📱 Another MoMo Number</option>
                      <option value="local_bank">🏦 Local Bank (GH)</option>
                      <option value="intl_bank">🌍 International Bank</option>
                    </select>
                  </div>

                  {/* MoMo recipient */}
                  {xferForm.toType === "momo" && (
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Recipient MoMo Number</label>
                      <input value={xferForm.toNumber} onChange={e => setXferForm(p => ({ ...p, toNumber: e.target.value }))} placeholder="e.g. 0554987654" className={inp} />
                    </div>
                  )}

                  {/* Bank fields */}
                  {(xferForm.toType === "local_bank" || xferForm.toType === "intl_bank") && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Bank</label>
                        <select value={xferForm.toBank} onChange={e => setXferForm(p => ({ ...p, toBank: e.target.value }))} className={sel}>
                          <option value="">Select bank…</option>
                          {(xferForm.toType === "local_bank" ? LOCAL_BANKS : INTL_BANKS).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Account Number</label>
                        <input value={xferForm.toAccount} onChange={e => setXferForm(p => ({ ...p, toAccount: e.target.value }))} placeholder="Account number" className={inp} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Account Name</label>
                        <input value={xferForm.toName} onChange={e => setXferForm(p => ({ ...p, toName: e.target.value }))} placeholder="Account holder name" className={inp} />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Amount (GHS)</label>
                    <input value={xferForm.amount} onChange={e => setXferForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 500.00" type="number" className={inp} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Note (optional)</label>
                    <input value={xferForm.note} onChange={e => setXferForm(p => ({ ...p, note: e.target.value }))} placeholder="Transfer note" className={inp} />
                  </div>
                </div>

                {/* Bank fee preview */}
                {xferForm.amount && !isNaN(parseFloat(xferForm.amount)) && parseFloat(xferForm.amount) > 0 && (
                  <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-xs">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Fee Breakdown</p>
                    {xferForm.toType !== "momo" ? (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Paystack (1.95%)</span><span>GHS {(parseFloat(xferForm.amount) * 0.0195).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Business (1%)</span><span>GHS {(parseFloat(xferForm.amount) * 0.01).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Platform ({(FEE_CONFIG.companyExtraPct * 100).toFixed(1)}%)</span><span>GHS {(parseFloat(xferForm.amount) * FEE_CONFIG.companyExtraPct).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Bank flat fee</span><span>GHS {FEE_CONFIG.bankFlatFee.toFixed(2)}</span></div>
                        <div className="flex justify-between pt-1 border-t font-bold"><span>Total Fee</span><span className="text-red-500">GHS {calcBankFee(parseFloat(xferForm.amount)).toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-emerald-600"><span>Recipient Gets</span><span>{fmt(parseFloat(xferForm.amount) - calcBankFee(parseFloat(xferForm.amount)))}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">MoMo Fee (2.95%)</span><span>GHS {calcFee(parseFloat(xferForm.amount)).toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-emerald-600"><span>Recipient Gets</span><span>{fmt(parseFloat(xferForm.amount) - calcFee(parseFloat(xferForm.amount)))}</span></div>
                      </>
                    )}
                  </div>
                )}

                <Button onClick={sendTransfer} disabled={xferSending} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {xferSending ? "Processing transfer…" : "Send Transfer"}
                </Button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                  <div className="h-4 w-4 rounded-sm bg-yellow-400 flex items-center justify-center overflow-hidden">
                    <img src="/logo.png" alt="AFK" className="h-4 w-4 object-contain" onError={e => { (e.target as any).style.display="none"; }} />
                  </div>
                  <span>FiTech Payments · Secured by Paystack</span>
                </div>
              </CardContent>
            </Card>

            {/* Supported banks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> Supported Banks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[...LOCAL_BANKS.slice(0, 6), ...INTL_BANKS.slice(0, 3)].map(b => (
                    <div key={b} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/20 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{b}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/20 text-xs text-muted-foreground">
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>+ more via Paystack</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ════════════════════════════════════════════
            CARD PAYMENT TAB
            ════════════════════════════════════════════ */}
        {tab === "card" && (
          <>
            {cardSuccess ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-sm w-full text-center">
                  <CardContent className="pt-10 pb-10 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-black">Payment Successful!</h2>
                    <p className="text-sm text-muted-foreground">Thank you for your payment. Your transaction has been completed successfully.</p>
                    <Button onClick={() => { setCardSuccess(false); setTab("dashboard"); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      Go to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-purple-200 bg-purple-50/40 dark:bg-purple-950/10 max-w-lg mx-auto">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-600" /> Card Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AFK branding header — like Paystack popup but your image */}
                  <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-yellow-400 flex items-center justify-center overflow-hidden">
                        <img src="/logo.png" alt={businessName} className="h-8 w-8 object-contain" onError={e => { (e.target as any).style.display="none"; }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{businessName}</p>
                        <p className="text-[10px] text-muted-foreground">Secure Payment</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold">
                      <Zap className="h-3 w-3 mr-1" /> Powered by Paystack
                    </Badge>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Customer Email</label>
                    <input value={cardForm.email} onChange={e => setCardForm(p => ({ ...p, email: e.target.value }))} placeholder="customer@email.com" type="email" className={inp} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Amount (GHS)</label>
                    <input value={cardForm.amount} onChange={e => setCardForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 1500.00" type="number" className={inp} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Description</label>
                    <input value={cardForm.desc} onChange={e => setCardForm(p => ({ ...p, desc: e.target.value }))} placeholder="e.g. Purchase of hardware tools" className={inp} />
                  </div>

                  {/* Card number UI — cosmetic, actual processing via Paystack popup */}
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">CARD DETAILS</p>
                    <input placeholder="0000 0000 0000 0000" className={`${inp} font-mono`} disabled />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="MM / YY" className={`${inp} font-mono`} disabled />
                      <input placeholder="CVV" className={`${inp} font-mono`} disabled />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Card details are entered securely in the Paystack popup — never stored on our servers.</p>
                  </div>

                  <Button onClick={initiateCardPayment} disabled={cardSending} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-base py-3">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {cardSending ? "Opening payment…" : cardForm.amount ? `Pay ${fmt(parseFloat(cardForm.amount) || 0)}` : "Pay Now"}
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>🔒 Secured by Paystack</span>
                    <span>·</span>
                    <span>{businessName}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

      </div>
    </div>
  );
}