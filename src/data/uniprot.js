const API_ROOT = 'https://rest.uniprot.org/uniprotkb';
const CACHE_PREFIX = 'protein-explorer-cache-v1:';
const CACHE_TTL = 1000 * 60 * 60 * 24;

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.savedAt > CACHE_TTL) return null;
    return cached.value;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Storage can be unavailable in private browsing; live API data still works.
  }
}

async function fetchJson(url, cacheKey) {
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`UniProt request failed (${response.status})`);
  }

  const json = await response.json();
  writeCache(cacheKey, json);
  return json;
}

export async function fetchProteinsByAccessions(accessions) {
  const uniqueAccessions = [...new Set(accessions)].filter(Boolean);
  if (!uniqueAccessions.length) return [];

  const url = `${API_ROOT}/accessions?accessions=${encodeURIComponent(uniqueAccessions.join(','))}&format=json`;
  const data = await fetchJson(url, `accessions:${uniqueAccessions.join(',')}`);
  const byAccession = new Map((data.results ?? []).map((entry) => [entry.primaryAccession, normalizeProtein(entry)]));
  return uniqueAccessions.map((accession) => byAccession.get(accession)).filter(Boolean);
}

export async function fetchProtein(accession) {
  const data = await fetchJson(`${API_ROOT}/${encodeURIComponent(accession)}.json`, `protein:${accession}`);
  return normalizeProtein(data);
}

export async function searchProteins(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const searchTerms = [
    `(${cleanQuery})`,
    `gene:${cleanQuery}`,
    `organism_name:${cleanQuery}`,
    `accession:${cleanQuery}`,
  ].join(' OR ');

  const search = `reviewed:true AND (${searchTerms})`;
  const url = `${API_ROOT}/search?query=${encodeURIComponent(search)}&size=18&format=json`;
  const data = await fetchJson(url, `search:${cleanQuery.toLowerCase()}`);
  return (data.results ?? []).map(normalizeProtein);
}

function normalizeProtein(entry) {
  const accession = entry.primaryAccession;
  const xrefs = entry.uniProtKBCrossReferences ?? [];
  const pdbIds = xrefs.filter((xref) => xref.database === 'PDB').map((xref) => xref.id);
  const hasAlphaFold = xrefs.some((xref) => xref.database === 'AlphaFoldDB');
  const hasInterPro = xrefs.some((xref) => xref.database === 'InterPro');
  const functionText = getFunctionText(entry);
  const interestingFact = getInterestingFact(entry);
  const categoryTags = getCategoryTags(entry, functionText);

  return {
    accession,
    reviewed: entry.entryType?.includes('reviewed') ?? false,
    id: entry.uniProtkbId,
    name: getProteinName(entry),
    organism: entry.organism?.commonName
      ? `${entry.organism.commonName} (${entry.organism.scientificName})`
      : entry.organism?.scientificName ?? 'Organism not listed',
    organismScientific: entry.organism?.scientificName,
    gene: getGene(entry),
    functionText,
    beginnerSummary: getBeginnerSummary(functionText),
    sequenceLength: entry.sequence?.length ?? null,
    molecularWeight: entry.sequence?.molWeight ?? null,
    pdbIds,
    hasAlphaFold,
    hasInterPro,
    categoryTags,
    sourceBadges: getSourceBadges(pdbIds, hasAlphaFold, hasInterPro),
    interestingFact,
    citations: getCitations(entry),
    sourceLinks: getSourceLinks(accession, pdbIds, hasAlphaFold, hasInterPro),
    raw: entry,
  };
}

function getProteinName(entry) {
  return (
    entry.proteinDescription?.recommendedName?.fullName?.value ??
    entry.proteinDescription?.submissionNames?.[0]?.fullName?.value ??
    entry.proteinDescription?.alternativeNames?.[0]?.fullName?.value ??
    entry.uniProtkbId ??
    entry.primaryAccession
  );
}

function getGene(entry) {
  return (
    entry.genes?.[0]?.geneName?.value ??
    entry.genes?.[0]?.synonyms?.[0]?.value ??
    'Gene not listed'
  );
}

function getFunctionText(entry) {
  const functionComment = (entry.comments ?? []).find((comment) => comment.commentType === 'FUNCTION');
  return functionComment?.texts?.map((text) => text.value).filter(Boolean).join(' ') ?? '';
}

function getInterestingFact(entry) {
  const priorityTypes = ['MISCELLANEOUS', 'BIOPHYSICOCHEMICAL PROPERTIES', 'CATALYTIC ACTIVITY', 'SUBUNIT'];
  for (const type of priorityTypes) {
    const comment = (entry.comments ?? []).find((item) => item.commentType === type);
    const text = comment?.texts?.[0]?.value ?? comment?.reaction?.name;
    if (text) return { label: type.toLowerCase().replaceAll('_', ' '), text };
  }
  return null;
}

function getCategoryTags(entry, functionText) {
  const name = getProteinName(entry).toLowerCase();
  const keywords = (entry.keywords ?? []).map((keyword) => keyword.name?.toLowerCase()).join(' ');
  const text = `${name} ${keywords} ${functionText.toLowerCase()}`;
  const tags = [];

  if (includesAny(text, ['enzyme', 'kinase', 'protease', 'transferase', 'hydrolase', 'oxidase', 'synthase', 'dehydrogenase', 'catalase', 'phosphatase'])) {
    tags.push('enzyme');
  }
  if (includesAny(text, ['hormone', 'insulin', 'interferon', 'cytokine', 'growth factor'])) {
    tags.push('hormone');
  }
  if (includesAny(text, ['receptor', 'receptor activity'])) {
    tags.push('receptor');
  }
  if (includesAny(text, ['immunoglobulin', 'antibody'])) {
    tags.push('antibody');
  }
  if (includesAny(text, ['structural protein', 'actin', 'keratin', 'collagen', 'cytoskeleton', 'microtubule'])) {
    tags.push('structural protein');
  }

  return tags.slice(0, 3);
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function getBeginnerSummary(functionText) {
  if (!functionText) {
    return 'UniProt does not provide a concise function annotation for this entry yet.';
  }

  const firstSentence = functionText.split(/(?<=[.!?])\s+/).find(Boolean) ?? functionText;
  return `In plain language: ${firstSentence}`;
}

function getCitations(entry) {
  const ids = new Set();
  for (const comment of entry.comments ?? []) {
    for (const text of comment.texts ?? []) {
      for (const evidence of text.evidences ?? []) {
        if (evidence.source === 'PubMed' && evidence.id) ids.add(evidence.id);
      }
    }
  }

  return [...ids].slice(0, 5).map((id) => ({
    id,
    label: `PubMed ${id}`,
    href: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
  }));
}

function getSourceBadges(pdbIds, hasAlphaFold, hasInterPro) {
  return [
    'UniProt',
    pdbIds.length > 0 ? 'PDB' : null,
    hasAlphaFold ? 'AlphaFold' : null,
    hasInterPro ? 'InterPro' : null,
  ].filter(Boolean);
}

function getSourceLinks(accession, pdbIds, hasAlphaFold, hasInterPro) {
  const links = [
    {
      label: 'UniProt',
      href: `https://www.uniprot.org/uniprotkb/${accession}/entry`,
    },
  ];

  if (hasAlphaFold) {
    links.push({
      label: 'AlphaFold',
      href: `https://alphafold.ebi.ac.uk/entry/${accession}`,
    });
  }

  if (hasInterPro) {
    links.push({
      label: 'InterPro',
      href: `https://www.ebi.ac.uk/interpro/protein/UniProt/${accession}/`,
    });
  }

  for (const pdbId of pdbIds.slice(0, 4)) {
    links.push({
      label: `PDB ${pdbId}`,
      href: `https://www.rcsb.org/structure/${pdbId}`,
    });
  }

  return links;
}

export function formatDaltons(value) {
  if (!value) return 'Not listed';
  return `${Math.round(value / 1000).toLocaleString()} kDa`;
}
