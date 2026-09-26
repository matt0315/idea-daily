"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SKILLS = [
  ["tech", "Technical"],
  ["sales", "Sales"],
  ["design", "Design"],
  ["domain", "Domain"],
] as const;

export function FitQuiz({ initial }: { initial?: Record<string, unknown> | null }) {
  const router = useRouter();
  const skills = (initial?.skills as Record<string, number>) || { tech: 3, sales: 2, design: 2, domain: 2 };
  const [form, setForm] = useState({
    tech: skills.tech ?? 3,
    sales: skills.sales ?? 2,
    design: skills.design ?? 2,
    domain: skills.domain ?? 2,
    weeklyHours: Number(initial?.weeklyHours ?? 15),
    capitalBand: String(initial?.capitalBand ?? "low"),
    riskTolerance: String(initial?.riskTolerance ?? "medium"),
    model: String(initial?.model ?? "b2b"),
    motion: String(initial?.motion ?? "saas"),
    industries: Array.isArray(initial?.industries) ? (initial?.industries as string[]).join(", ") : "trades",
    location: String(initial?.location ?? ""),
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/fit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skills: { tech: form.tech, sales: form.sales, design: form.design, domain: form.domain },
        weeklyHours: form.weeklyHours,
        capitalBand: form.capitalBand,
        riskTolerance: form.riskTolerance,
        model: form.model,
        motion: form.motion,
        industries: form.industries.split(",").map((item) => item.trim()).filter(Boolean),
        location: form.location,
      }),
    });
    if (!response.ok) {
      setError("Sign in before saving a profile.");
      return;
    }
    router.push("/fit?saved=1");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-line bg-card p-6 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2">
        {SKILLS.map(([key, label]) => (
          <label key={key} className="text-sm">
            {label} skill ({form[key]}/5)
            <input type="range" min={0} max={5} value={form[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} className="mt-1 w-full" />
          </label>
        ))}
      </div>
      <label className="block text-sm">
        Hours per week ({form.weeklyHours})
        <input type="range" min={2} max={60} value={form.weeklyHours} onChange={(event) => setForm({ ...form, weeklyHours: Number(event.target.value) })} className="mt-1 w-full" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Capital" value={form.capitalBand} onChange={(value) => setForm({ ...form, capitalBand: value })} options={["none", "low", "medium", "high"]} />
        <Select label="Risk tolerance" value={form.riskTolerance} onChange={(value) => setForm({ ...form, riskTolerance: value })} options={["low", "medium", "high"]} />
        <Select label="Market" value={form.model} onChange={(value) => setForm({ ...form, model: value })} options={["b2b", "b2c", "either"]} />
        <Select label="Motion" value={form.motion} onChange={(value) => setForm({ ...form, motion: value })} options={["saas", "service", "either"]} />
      </div>
      <label className="block text-sm">
        Industries (comma separated)
        <input value={form.industries} onChange={(event) => setForm({ ...form, industries: event.target.value })} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2" />
      </label>
      <label className="block text-sm">
        Location
        <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2" />
      </label>
      {error ? <p className="text-sm text-copper">{error}</p> : null}
      <button className="rounded-full bg-teal px-4 py-2 text-sm text-white" type="submit">Save profile</button>
    </form>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="text-sm">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
