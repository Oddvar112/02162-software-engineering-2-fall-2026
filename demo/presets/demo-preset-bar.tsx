"use client";

import { useEffect, useId, useState } from "react";
import { Zap, BookmarkPlus, Trash2, XCircle, Check } from "lucide-react";
import type { ActionCard } from "@/lib/game/types";
import {
  applyPresetToHand,
  deleteCustomPreset,
  getAllPresets,
  getPresetCardsSummary,
  saveCustomPreset,
} from "./index";
import type { DemoPreset } from "../types";

export interface DemoPresetBarProps {
  cardsInHand: ActionCard[];
  selectedIds: string[];
  onApplyPreset: (cardIds: string[]) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function DemoPresetBar({
  cardsInHand,
  selectedIds,
  onApplyPreset,
  onClear,
  disabled = false,
}: DemoPresetBarProps) {
  const selectId = useId();
  const [presets, setPresets] = useState<DemoPreset[]>(() => getAllPresets());
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [customName, setCustomName] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync presets on mount
  useEffect(() => {
    setPresets(getAllPresets());
  }, []);

  const customPresets = presets.filter((p) => p.isCustom);
  const defaultPresets = presets.filter((p) => !p.isCustom);
  const activePreset = presets.find((p) => p.id === selectedPresetId);

  // Selected cards converted to names
  const selectedCards = selectedIds.flatMap((id) =>
    cardsInHand.filter((card) => card.id === id),
  );
  const selectedCardNames = selectedCards.map((c) => c.name);

  function handleSelectPreset(presetId: string) {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    const matchingIds = applyPresetToHand(preset, cardsInHand);
    onApplyPreset(matchingIds);
  }

  function handleSaveCustom() {
    if (!customName.trim() || selectedCardNames.length === 0) return;
    const newPreset = saveCustomPreset(customName, selectedCardNames);
    const updated = getAllPresets();
    setPresets(updated);
    setSelectedPresetId(newPreset.id);
    setIsSaving(false);
    setCustomName("");
    setSaveSuccessMsg(`Preset "${newPreset.name}" saved!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  }

  function handleDeletePreset(presetId: string) {
    deleteCustomPreset(presetId);
    const updated = getAllPresets();
    setPresets(updated);
    if (selectedPresetId === presetId) {
      setSelectedPresetId("");
    }
  }

  return (
    <div
      className="my-2 w-full rounded-lg border border-amber-500/30 bg-slate-900/95 p-2.5 text-xs text-slate-200 shadow-md"
      aria-label="Demo program presets"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            <Zap className="h-3 w-3 text-amber-400" />
            Demo Presets
          </span>
          <label htmlFor={selectId} className="sr-only">
            Choose Program Preset
          </label>
          <select
            id={selectId}
            value={selectedPresetId}
            disabled={disabled}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="cursor-pointer rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
            aria-label="Demo Presets Selector"
          >
            <option value="">⚡ Quick Presets…</option>
            <optgroup label="Default Presets">
              {defaultPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.cardNames.length} cards)
                </option>
              ))}
            </optgroup>
            {customPresets.length > 0 && (
              <optgroup label="Saved Custom Presets">
                {customPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    ★ {p.name} ({p.cardNames.length} cards)
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {activePreset && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleSelectPreset(activePreset.id)}
              className="cursor-pointer rounded bg-amber-600/80 px-2 py-1 text-xs font-bold text-slate-950 transition hover:bg-amber-600 disabled:opacity-50"
              title="Re-apply this preset to your program"
            >
              Apply
            </button>
          )}

          {activePreset?.isCustom && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleDeletePreset(activePreset.id)}
              className="flex cursor-pointer items-center gap-1 rounded border border-red-800/50 bg-red-950/80 px-2 py-1 text-xs text-red-300 transition hover:bg-red-900 disabled:opacity-50"
              title="Delete this custom preset"
              aria-label={`Delete custom preset ${activePreset.name}`}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && !isSaving && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setCustomName(`Combo ${selectedIds.length}`);
                setIsSaving(true);
              }}
              className="flex cursor-pointer items-center gap-1 rounded border border-emerald-600/60 bg-emerald-700/80 px-2 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-600 disabled:opacity-50"
              title="Save currently selected cards as a reusable preset"
            >
              <BookmarkPlus className="h-3 w-3" />
              Save Preset ({selectedIds.length})
            </button>
          )}

          {selectedIds.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="flex cursor-pointer items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
              title="Clear all selected cards"
            >
              <XCircle className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {isSaving && (
        <div className="mb-2 flex items-center gap-2 rounded border border-emerald-500/40 bg-slate-800/80 p-2">
          <span className="text-[11px] font-medium text-emerald-300">
            Save {selectedIds.length} card(s) as preset:
          </span>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Preset Name"
            className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
            aria-label="Preset Name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveCustom();
              if (e.key === "Escape") setIsSaving(false);
            }}
          />
          <button
            type="button"
            onClick={handleSaveCustom}
            disabled={!customName.trim()}
            className="cursor-pointer rounded bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsSaving(false)}
            className="cursor-pointer rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300 transition hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="mb-1 flex items-center gap-1.5 text-[11px] text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          {saveSuccessMsg}
        </div>
      )}

      {activePreset && (
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <span className="font-medium text-amber-400">
            {activePreset.name}:
          </span>
          <span>{getPresetCardsSummary(activePreset.cardNames)}</span>
          {activePreset.description && (
            <span className="italic text-slate-500">
              — {activePreset.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
