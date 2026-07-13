import JSZip from 'jszip';

// Reads only the named top-level entries out of a zip (as base64), ignoring
// everything else - both TV Time's GDPR export and Letterboxd's export bundle
// many unrelated/irrelevant files (auth logs, ip addresses, deleted/ and
// likes/ subfolders) alongside the CSVs we actually want.
export async function readZipEntries(
  base64: string,
  wantedNames: string[],
): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const wanted = new Set(wantedNames);
  const result: Record<string, string> = {};

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !wanted.has(path)) continue;
    result[path] = await entry.async('text');
  }

  return result;
}
