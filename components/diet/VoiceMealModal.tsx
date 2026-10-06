"use client";
import { useState } from "react";
import { Mic, Square, Loader2, X, Check, Trash2, RotateCcw, Sparkles, Utensils } from "lucide-react";
import { useAudioRecorder, audioExt } from "@/hooks/useAudioRecorder";
import type { MealMacros } from "@/types";

type Phase = "idle" | "recording" | "processing" | "review" | "error";

export interface ParsedMeal { name: string; macros: MealMacros }

export default function VoiceMealModal({
  onAdd,
  onClose,
}: {
  onAdd: (meals: ParsedMeal[]) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [meals, setMeals] = useState<ParsedMeal[]>([]);
  const [error, setError] = useState("");

  const processAudio = async (blob: Blob) => {
    try {
      const fd = new FormData();
      fd.append("audio", blob, `meal.${audioExt(blob.type)}`);
      const res = await fetch("/api/voice-meal", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) { setError(data.error); setPhase("error"); return; }
      setTranscript(data.transcript || "");
      setMeals(Array.isArray(data.meals) ? data.meals : []);
      setPhase("review");
    } catch {
      setError("Something went wrong processing your recording. Try again.");
      setPhase("error");
    }
  };

  const { seconds, start, stop } = useAudioRecorder(processAudio);

  const startRecording = async () => {
    setError("");
    const err = await start();
    if (err) { setError(err); setPhase("error"); } else setPhase("recording");
  };
  const stopRecording = () => { stop(); setPhase("processing"); };

  const reset = () => { setTranscript(""); setMeals([]); setError(""); setPhase("idle"); };
  const removeMeal = (i: number) => setMeals((prev) => prev.filter((_, idx) => idx !== i));

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pt-4 pb-24 sm:p-4">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div
        className="relative rounded-xl w-full max-w-md p-5 animate-slide-up max-h-[80dvh] overflow-y-auto"
        style={{ background: "var(--surface-0)", border: "1px solid var(--border)", boxShadow: "var(--shadow-dialog)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text-1)" }}>
            <Mic className="w-4 h-4 text-emerald-500" /> Log meal by voice
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        {/* ── Idle ── */}
        {phase === "idle" && (
          <div className="text-center py-4">
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center mx-auto transition-colors"
              style={{ color: "var(--on-accent)" }}
            >
              <Mic className="w-7 h-7" />
            </button>
            <p className="text-sm font-bold mt-4" style={{ color: "var(--text-1)" }}>Tap and say what you ate</p>
            <p className="text-xs mt-1.5 leading-relaxed px-4" style={{ color: "var(--text-3)" }}>
              For example<br />
              <span className="italic" style={{ color: "var(--text-2)" }}>
                “Two rotis with dal, a bowl of curd and a boiled egg.”
              </span>
            </p>
          </div>
        )}

        {/* ── Recording ── */}
        {phase === "recording" && (
          <div className="text-center py-4">
            <button
              onClick={stopRecording}
              className="relative w-16 h-16 rounded-lg flex items-center justify-center mx-auto transition-colors"
              style={{ background: "var(--status-danger)", color: "var(--on-accent)" }}
            >
              <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
              <Square className="w-6 h-6 relative z-10" fill="currentColor" />
            </button>
            <p className="text-2xl font-black mt-4 tabular-nums" style={{ color: "var(--text-1)" }}>{mmss}</p>
            <p className="text-xs mt-1 font-semibold text-rose-500">Listening… tap to finish</p>
          </div>
        )}

        {/* ── Processing ── */}
        {phase === "processing" && (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
            <p className="text-sm font-bold mt-4" style={{ color: "var(--text-1)" }}>Transcribing &amp; estimating…</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Working out the macros</p>
          </div>
        )}

        {/* ── Error ── */}
        {phase === "error" && (
          <div className="text-center py-6">
            <p className="text-sm font-semibold text-red-500 px-4">{error}</p>
            <button onClick={reset} className="btn-secondary text-sm mt-4 inline-flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        )}

        {/* ── Review ── */}
        {phase === "review" && (
          <div className="space-y-4">
            {transcript && (
              <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface-3)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-3)" }}>Heard</p>
                <p className="text-xs italic" style={{ color: "var(--text-2)" }}>“{transcript}”</p>
              </div>
            )}

            {meals.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>Couldn’t work out a meal</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Try again and name the foods you ate.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                  <Sparkles className="w-3.5 h-3.5" /> AI estimated — review before logging
                </div>
                <div className="space-y-2">
                  {meals.map((m, i) => (
                    <div key={i} className="card flex items-center gap-3" style={{ borderLeftColor: "var(--accent)", borderLeftWidth: "3px" }}>
                      <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Utensils className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: "var(--text-1)" }}>{m.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                          {m.macros.calories} kcal · {m.macros.proteinG}P {m.macros.carbsG}C {m.macros.fatG}F
                        </p>
                      </div>
                      <button onClick={() => removeMeal(i)}
                        className="p-2 rounded-lg hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all flex-shrink-0"
                        style={{ color: "var(--text-3)" }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={reset} className="btn-secondary flex-1 text-sm inline-flex items-center justify-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Redo
              </button>
              <button onClick={() => onAdd(meals)} disabled={meals.length === 0}
                className="btn-primary flex-1 text-sm inline-flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> Log {meals.length > 1 ? `${meals.length} meals` : "meal"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
