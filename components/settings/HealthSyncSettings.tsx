"use client";
import { useState, useEffect } from "react";
import { Copy, Check, RefreshCw, Send, Loader2, Apple, Smartphone, ChevronDown, ChevronUp } from "lucide-react";

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {n}
      </span>
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-3)" }} dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

function PlatformGuide({ platform }: { platform: "apple" | "mi" }) {
  const [open, setOpen] = useState(false);

  const appleSteps = [
    `On your iPhone, install <span class="font-semibold text-white">Health Auto Export</span> from the App Store (it's free with a one-time purchase for REST API).`,
    `Open the app → tap <span class="font-semibold text-white">Automations</span> → <span class="font-semibold text-white">+ New Automation</span>.`,
    `Choose <span class="font-semibold text-white">REST API</span> as the export type.`,
    `Paste your sync link into the <span class="font-semibold text-white">URL</span> field. Method: <span class="font-semibold text-white">POST</span>. Format: <span class="font-semibold text-white">JSON</span>.`,
    `Under <span class="font-semibold text-white">Data</span>, enable: <span class="font-semibold text-white">Workouts</span>, <span class="font-semibold text-white">Body Mass</span>, <span class="font-semibold text-white">Steps</span>.`,
    `Set the <span class="font-semibold text-white">Key Mapping</span> → workouts array key: <span class="font-mono text-[10px] bg-black/30 px-1 rounded">workouts</span>, body mass key: <span class="font-mono text-[10px] bg-black/30 px-1 rounded">bodyWeightKg</span>, steps key: <span class="font-mono text-[10px] bg-black/30 px-1 rounded">steps</span>.`,
    `Set schedule to <span class="font-semibold text-white">Every Hour</span> (or Daily). Tap <span class="font-semibold text-white">Save</span>.`,
    `Tap <span class="font-semibold text-white">Run Now</span> once to test — then come back and tap <span class="font-semibold text-white">Send test data</span> above to confirm it worked.`,
  ];

  const miSteps = [
    `<span class="font-semibold text-white">iPhone users:</span> Mi Fitness on iPhone syncs directly to <span class="font-semibold text-white">Apple Health</span> — skip to the Apple Watch guide above. Health Auto Export reads from Apple Health, so it picks up your Mi Watch data automatically.`,
    `<span class="font-semibold text-white">Android users:</span> Install <span class="font-semibold text-white">Health Connect</span> from the Play Store (free, by Google).`,
    `Open <span class="font-semibold text-white">Mi Fitness</span> → Profile → Settings → <span class="font-semibold text-white">Health Connect</span> → Enable sync. Allow all permissions (workouts, body weight, steps).`,
    `Install <span class="font-semibold text-white">MacroDroid</span> (free) from the Play Store — the easiest way to send data to a webhook on Android.`,
    `MacroDroid → <span class="font-semibold text-white">Macros</span> → + → Trigger: <span class="font-semibold text-white">Timer</span> → Repeat every 1 hour.`,
    `Add Action → <span class="font-semibold text-white">Networking</span> → <span class="font-semibold text-white">HTTP Request</span>. Method: POST. URL: paste your sync link.`,
    `Headers: <span class="font-mono text-[10px] bg-black/30 px-1 rounded">Content-Type: application/json</span>. Body: <span class="font-mono text-[10px] bg-black/30 px-1 rounded">{"steps":8000,"bodyWeightKg":75}</span> (swap in MacroDroid Health Connect variables for live data).`,
    `Save and run once manually. Come back here and tap <span class="font-semibold text-white">Send test data</span> to confirm the endpoint is working.`,
  ];

  const steps = platform === "apple" ? appleSteps : miSteps;
  const label = platform === "apple" ? "Apple Watch / iPhone" : "Mi Watch / Android";
  const Icon = platform === "apple" ? Apple : Smartphone;
  const color = platform === "apple" ? "var(--text-1)" : "var(--status-success)";

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: open ? "var(--surface-2)" : "var(--surface-1)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--surface-3)" }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold" style={{ color: "var(--text-1)" }}>{label}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
            {open ? "Tap to collapse" : `${steps.length}-step setup guide`}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
          : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-3)" }} />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3" style={{ background: "var(--surface-1)" }}>
          {steps.map((text, i) => (
            <Step key={i} n={i + 1} text={text} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HealthSyncSettings() {
  const [token, setToken] = useState("");
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/health/token")
      .then((r) => r.json())
      .then((d) => { if (d.token) setToken(d.token); })
      .finally(() => setLoading(false));
  }, []);

  const ingestUrl = token ? `${origin}/api/health/ingest?token=${token}` : "";

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard blocked */ }
  };

  const regenerate = async () => {
    if (!window.confirm("Generate a new sync link? Your current link will stop working and you'll need to update any connected device.")) return;
    setRegenerating(true);
    setTestResult(null);
    try {
      const d = await fetch("/api/health/token?regenerate=1").then((r) => r.json());
      if (d.token) setToken(d.token);
    } finally {
      setRegenerating(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/health/ingest?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workouts: [{ type: "running", durationMin: 28, distanceKm: 5, calories: 300, externalId: "test-" + Date.now() }],
          bodyWeightKg: 78.2,
          steps: 8200,
        }),
      });
      const d = await res.json();
      setTestResult(
        d.ok
          ? { ok: true, msg: `Logged ${d.workouts} workout + body weight + steps. Check the Workout & Diet pages!` }
          : { ok: false, msg: d.error || "Something went wrong" },
      );
    } catch {
      setTestResult({ ok: false, msg: "Couldn't reach the endpoint" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-3)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Sync your watch &amp; health data</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-3)" }}>
          Push workouts, body weight and steps into DailyOS from any device that can send data to a web address —
          they&apos;ll auto-appear on your Workout and Diet pages. This is your private sync link; keep it secret.
        </p>
      </div>

      {/* Sync link */}
      <div className="rounded-2xl px-4 py-4" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
          Your sync link
        </label>
        <div className="mt-2 flex items-center gap-2">
          <code
            className="flex-1 min-w-0 truncate text-xs px-3 py-2.5 rounded-xl font-mono"
            style={{ background: "var(--surface-3)", color: "var(--text-2)", border: "1px solid var(--border)" }}
          >
            {ingestUrl || "Generating…"}
          </code>
          <button
            onClick={() => copy(ingestUrl, "url")}
            className="p-2.5 rounded-xl flex-shrink-0 active:scale-90 transition-all"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            title="Copy sync link"
          >
            {copied === "url" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={sendTest}
            disabled={testing || !token}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send test data
          </button>
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate
          </button>
        </div>

        {testResult && (
          <p
            className="text-xs mt-3 font-semibold"
            style={{ color: testResult.ok ? "var(--status-success)" : "var(--status-danger)" }}
          >
            {testResult.ok ? "✓ " : "✗ "}{testResult.msg}
          </p>
        )}
      </div>

      {/* How to connect */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-3)" }}>
          Connect your watch
        </p>
        <PlatformGuide platform="apple" />
        <PlatformGuide platform="mi" />
      </div>
    </div>
  );
}
