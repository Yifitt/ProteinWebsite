export const SEED_PROTEINS = [
  { accession: 'P69905' },
  { accession: 'P68871' },
  { accession: 'P01308' },
  { accession: 'P05067' },
  { accession: 'P42212' },
  { accession: 'P00533' },
  { accession: 'P04637' },
  { accession: 'P38398' },
  { accession: 'P0DTC2' },
  { accession: 'P00734' },
  { accession: 'P61626' },
  { accession: 'P99999' },
  { accession: 'Q99ZW2' },
  { accession: 'P08684' },
  { accession: 'P04406' },
  { accession: 'P05231' },
  { accession: 'P01116' },
  { accession: 'P02768' },
  { accession: 'P01857' },
  { accession: 'P68133' },
  { accession: 'P60709' },
  { accession: 'P29474' },
  { accession: 'P02745' },
  { accession: 'P01009' },
  { accession: 'P04040' },
  { accession: 'P01024' },
  { accession: 'P01579' },
  { accession: 'P02766' },
  { accession: 'P01112' },
  { accession: 'P18031' },
  { accession: 'P03372' },
  { accession: 'P40763' },
  { accession: 'P10275' },
  { accession: 'P10809' },
  { accession: 'P02787' },
  { accession: 'P08581' },
];

export const seedAccessions = SEED_PROTEINS.map((protein) => protein.accession);

export function getSeedTheme(accession) {
  return SEED_PROTEINS.some((protein) => protein.accession === accession) ? 'Curated pick' : 'UniProt result';
}
