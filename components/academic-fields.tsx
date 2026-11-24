"use client";
import { useEffect, useState } from "react";
import type { AcademicCatalog } from "@/lib/academics";
import { programsForFaculty } from "@/lib/academics";
import { bundledAcademicCatalog } from "@/lib/academic-snapshot";

export function AcademicFields({ faculty: initialFaculty = "", program: initialProgram = "", demo = false }: {
  faculty?: string; program?: string; demo?: boolean;
}) {
  const [catalog, setCatalog] = useState<AcademicCatalog | null>(demo ? bundledAcademicCatalog : null);
  const [faculty, setFaculty] = useState(initialFaculty);
  const [program, setProgram] = useState(initialProgram);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    setError("");
    fetch("/api/academics", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw Error(body.error || "Daftar akademik belum dapat dimuat.");
        setCatalog(body.data);
      })
      .catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [demo, retry]);
  const programs = catalog ? programsForFaculty(catalog, faculty) : [];
  const oldFaculty = faculty && !catalog?.faculties.some((f) => f.name === faculty);
  const oldProgram = program && !programs.some((p) => p.label === program);
  return <>
    {/* Keep saved values while the catalogue is loading or unavailable. */}
    <input type="hidden" name="faculty" value={faculty} />
    <input type="hidden" name="program" value={program} />
    <label>Fakultas
      <select aria-label="Fakultas" value={faculty} disabled={!catalog} onChange={(e) => {
        setFaculty(e.target.value); setProgram("");
      }}>
        <option value="">{catalog ? "Pilih fakultas" : error ? "Daftar belum tersedia" : "Memuat fakultas..."}</option>
        {oldFaculty && <option value={faculty}>{faculty} (data sebelumnya)</option>}
        {catalog?.faculties.map((f) => <option value={f.name} key={f.id}>{f.name}</option>)}
      </select>
    </label>
    <label>Program studi
      <select aria-label="Program studi" value={program} disabled={!catalog || !faculty} required={Boolean(faculty) && !oldFaculty}
        onChange={(e) => setProgram(e.target.value)}>
        <option value="">{faculty ? "Pilih program studi" : "Pilih fakultas terlebih dahulu"}</option>
        {oldProgram && <option value={program}>{program} (data sebelumnya)</option>}
        {programs.map((p) => <option key={p.id} value={p.label}>{p.label}</option>)}
      </select>
    </label>
    {error && <p className="academic-message" role="status">Daftar fakultas dan prodi belum tersedia. Data tersimpan tetap dipertahankan.
      <button type="button" onClick={() => setRetry((value) => value + 1)}>Coba lagi</button>
    </p>}
  </>;
}
