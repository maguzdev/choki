"use client";

import { useState } from "react";

import { Switch } from "@/components/ui/switch";

export function FormSwitch({
  name,
  defaultChecked = false,
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className = "",
}: {
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const value = checked ?? internalChecked;

  function change(next: boolean) {
    if (checked === undefined) setInternalChecked(next);
    onCheckedChange?.(next);
  }

  return <label className={`flex min-h-11 items-center justify-between gap-3 text-sm font-semibold text-choco-600 ${className}`}>
    <span>{label}</span>
    {name ? <input type="hidden" name={name} value={value ? "on" : ""} /> : null}
    <Switch checked={value} onCheckedChange={change} disabled={disabled} aria-label={label} />
  </label>;
}
