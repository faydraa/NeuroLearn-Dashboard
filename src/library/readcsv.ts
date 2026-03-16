// src/library/readcsv.ts
export async function fetchCsvText(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch CSV (${res.status}): ${url}`);
  }
  return await res.text();
}

export function meanOfColumn(csvText: string, columnName: string): number {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV has no data rows.");

  const headers = lines[0].split(",");
  const idx = headers.indexOf(columnName);
  if (idx === -1) throw new Error(`Column "${columnName}" not found in CSV.`);

  let sum = 0;
  let n = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const val = Number(cols[idx]);
    if (!Number.isFinite(val)) continue;
    sum += val;
    n += 1;
  }

  if (n === 0) throw new Error(`No numeric values found in column "${columnName}".`);
  return sum / n;
}