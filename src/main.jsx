import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  Beaker,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Dices,
  ExternalLink,
  Filter,
  Heart,
  LoaderCircle,
  Menu,
  Moon,
  Search,
  Share2,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { SEED_PROTEINS, getSeedTheme, seedAccessions } from './data/seedProteins';
import { fetchProtein, fetchProteinsByAccessions, formatDaltons, searchProteins } from './data/uniprot';
import { useLocalStorage } from './hooks/useLocalStorage';
import './styles.css';

const todayIndex = getDayOfYear(new Date()) % seedAccessions.length;
const todayAccession = seedAccessions[todayIndex];

function App() {
  const [route, setRoute] = useState(getRouteFromHash());
  const [proteins, setProteins] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [status, setStatus] = useState('loading');
  const [searchStatus, setSearchStatus] = useState('idle');
  const [organismFilter, setOrganismFilter] = useState('all');
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [favorites, setFavorites] = useLocalStorage('protein-explorer-favorites', []);
  const [recentProteins, setRecentProteins] = useLocalStorage('protein-explorer-recent', []);
  const [theme, setTheme] = useLocalStorage('protein-explorer-theme', 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = getRouteFromHash();
      setRoute(nextRoute);
      setMenuOpen(false);
      if (!nextRoute.section) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (route.name !== 'home' || !route.section) return;
    window.setTimeout(() => {
      document.getElementById(route.section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [route]);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetchProteinsByAccessions(seedAccessions)
      .then((items) => {
        if (!active) return;
        setProteins(items);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setSearchResults([]);
      setSearchStatus('idle');
      return;
    }

    let active = true;
    setSearchStatus('loading');
    const timeoutId = window.setTimeout(() => {
      searchProteins(cleanQuery)
        .then((results) => {
          if (!active) return;
          setSearchResults(results);
          setSearchStatus('ready');
        })
        .catch(() => {
          if (!active) return;
          setSearchResults([]);
          setSearchStatus('error');
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const proteinOfDay = useMemo(
    () => proteins.find((protein) => protein.accession === todayAccession),
    [proteins],
  );

  const knownProteins = useMemo(() => mergeProteins(proteins, recentProteins), [proteins, recentProteins]);
  const favoriteProteins = favorites
    .map((accession) => knownProteins.find((protein) => protein.accession === accession))
    .filter(Boolean);

  function toggleFavorite(accession) {
    setFavorites((current) =>
      current.includes(accession)
        ? current.filter((item) => item !== accession)
        : [...current, accession],
    );
  }

  function openRandomProtein() {
    const pool = proteins.length ? proteins : SEED_PROTEINS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    window.location.hash = `#/protein/${pick.accession}`;
  }

  function markRecentlyViewed(protein) {
    setRecentProteins((current) => {
      const snapshot = makeRecentSnapshot(protein);
      const next = [snapshot, ...current.filter((item) => item.accession !== protein.accession)].slice(0, 6);
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }

  const routeProtein = route.name === 'protein' ? route.accession : null;

  return (
    <div className="app">
      <Header
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        theme={theme}
        setTheme={setTheme}
        onRandom={openRandomProtein}
      />
      <main>
        {route.name === 'home' && (
          <HomePage
            proteins={proteins}
            proteinOfDay={proteinOfDay}
            status={status}
            error={error}
            query={query}
            setQuery={setQuery}
            searchResults={searchResults}
            searchStatus={searchStatus}
            organismFilter={organismFilter}
            setOrganismFilter={setOrganismFilter}
            favorites={favorites}
            favoriteProteins={favoriteProteins}
            recentProteins={recentProteins}
            toggleFavorite={toggleFavorite}
            onRandom={openRandomProtein}
          />
        )}
        {routeProtein && (
          <ProteinPage
            accession={routeProtein}
            seedProteins={proteins}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onViewed={markRecentlyViewed}
          />
        )}
      </main>
    </div>
  );
}

function Header({ menuOpen, setMenuOpen, theme, setTheme, onRandom }) {
  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="Protein Explorer home">
        <span className="brand-mark"><Beaker size={21} /></span>
        <span>
          <strong>Protein Explorer</strong>
          <small>Real biology, friendly tour</small>
        </span>
      </a>

      <button className="icon-button menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu">
        <Menu size={22} />
      </button>

      <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Primary navigation">
        <button className="icon-button close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu">
          <X size={22} />
        </button>
        <a href="#discover">Discover</a>
        <a href="#favorites">Favorites</a>
        <a href="#sources">Sources</a>
        <button className="ghost-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <button className="primary-button compact" onClick={onRandom}>
          <Dices size={18} />
          Random Protein
        </button>
      </nav>
    </header>
  );
}

function HomePage({
  proteins,
  proteinOfDay,
  status,
  error,
  query,
  setQuery,
  searchResults,
  searchStatus,
  organismFilter,
  setOrganismFilter,
  favorites,
  favoriteProteins,
  recentProteins,
  toggleFavorite,
  onRandom,
}) {
  const baseProteins = query.trim() ? searchResults : proteins;
  const organismOptions = useMemo(() => getOrganismOptions(baseProteins), [baseProteins]);
  const displayedProteins = organismFilter === 'all'
    ? baseProteins
    : baseProteins.filter((protein) => protein.organism === organismFilter);

  useEffect(() => {
    if (baseProteins.length && organismFilter !== 'all' && !organismOptions.includes(organismFilter)) {
      setOrganismFilter('all');
    }
  }, [baseProteins.length, organismFilter, organismOptions, setOrganismFilter]);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={16} /> Official/public biological data</span>
          <h1>Meet proteins without needing a lab coat.</h1>
          <p>
            Search real UniProt entries, follow structure links, and collect fascinating proteins in a calmer,
            friendlier corner of biology.
          </p>
          <div className="hero-actions">
            <button className="primary-button large" onClick={onRandom}>
              <Dices size={21} />
              Random Protein
            </button>
            <a className="secondary-link" href="#discover">
              Start browsing <ChevronRight size={18} />
            </a>
          </div>
        </div>

        <div className="protein-of-day" aria-label="Protein of the Day">
          <span className="pill">Protein of the Day</span>
          {proteinOfDay ? (
            <>
              <h2>{proteinOfDay.name}</h2>
              <p>{proteinOfDay.beginnerSummary}</p>
              <ProteinMeta protein={proteinOfDay} />
              <a className="text-link" href={`#/protein/${proteinOfDay.accession}`}>
                Open profile <ChevronRight size={17} />
              </a>
            </>
          ) : (
            <LoadingBlock label="Choosing today's protein..." />
          )}
        </div>
      </section>

      <section className="search-band" id="discover">
        <div>
          <span className="section-kicker">Discover</span>
          <h2>Search by protein, gene, organism, or UniProt ID</h2>
        </div>
        <label className="search-box">
          <Search size={21} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try insulin, TP53, human, P0DTC2..."
            type="search"
          />
        </label>
        <label className="filter-box">
          <Filter size={18} />
          <select value={organismFilter} onChange={(event) => setOrganismFilter(event.target.value)}>
            <option value="all">All organisms</option>
            {organismOptions.map((organism) => (
              <option value={organism} key={organism}>{organism}</option>
            ))}
          </select>
        </label>
      </section>

      {searchStatus === 'loading' && <InlineState icon={<LoaderCircle className="spin" />} text="Searching UniProt..." />}
      {searchStatus === 'error' && <InlineState text="Search is having a quiet moment. Try again shortly." />}

      {status === 'loading' && <CardGridSkeleton />}
      {status === 'error' && <ErrorState message={error} />}
      {status === 'ready' && (
        <ProteinGrid
          proteins={displayedProteins}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          emptyText={query.trim() ? 'No reviewed UniProt entries matched that search.' : 'No proteins loaded yet.'}
        />
      )}

      <section className="favorites-section" id="favorites">
        <div className="section-heading">
          <span className="section-kicker">Favorites</span>
          <h2>Your saved proteins</h2>
        </div>
        {favoriteProteins.length ? (
          <ProteinGrid proteins={favoriteProteins} favorites={favorites} toggleFavorite={toggleFavorite} compact />
        ) : (
          <EmptyState text="Tap the heart on any card to keep it here for later." />
        )}
      </section>

      <section className="favorites-section">
        <div className="section-heading">
          <span className="section-kicker">Recently viewed</span>
          <h2>Your latest protein pages</h2>
        </div>
        {recentProteins.length ? (
          <ProteinGrid proteins={recentProteins} favorites={favorites} toggleFavorite={toggleFavorite} compact />
        ) : (
          <EmptyState text="Open a protein profile and it will appear here." />
        )}
      </section>

      <section className="source-strip" id="sources">
        <div>
          <span className="section-kicker">Sources</span>
          <h2>Grounded in public databases</h2>
        </div>
        <div className="source-links">
          <a href="https://www.uniprot.org/" target="_blank" rel="noreferrer">UniProt <ExternalLink size={15} /></a>
          <a href="https://www.rcsb.org/" target="_blank" rel="noreferrer">RCSB PDB <ExternalLink size={15} /></a>
          <a href="https://alphafold.ebi.ac.uk/" target="_blank" rel="noreferrer">AlphaFold <ExternalLink size={15} /></a>
        </div>
      </section>
    </>
  );
}

function ProteinGrid({ proteins, favorites, toggleFavorite, emptyText, compact = false }) {
  if (!proteins.length) return <EmptyState text={emptyText} />;

  return (
    <section className={compact ? 'protein-grid compact-grid' : 'protein-grid'} aria-live="polite">
      {proteins.map((protein) => (
        <ProteinCard
          key={protein.accession}
          protein={protein}
          isFavorite={favorites.includes(protein.accession)}
          onFavorite={() => toggleFavorite(protein.accession)}
        />
      ))}
    </section>
  );
}

function ProteinCard({ protein, isFavorite, onFavorite }) {
  return (
    <article className="protein-card">
      <div className="card-topline">
        <span className="pill soft">{getSeedTheme(protein.accession)}</span>
        <button className={isFavorite ? 'heart-button active' : 'heart-button'} onClick={onFavorite} aria-label="Toggle favorite">
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h3>{protein.name}</h3>
      <ProteinMeta protein={protein} />
      <p>{protein.functionText || 'UniProt does not list a concise function summary for this entry.'}</p>
      <div className="badge-row">
        <CategoryTags tags={protein.categoryTags} />
      </div>
      <div className="badge-row source-badges">
        <SourceBadges protein={protein} />
      </div>
      <a className="card-link" href={`#/protein/${protein.accession}`}>
        View protein <ChevronRight size={17} />
      </a>
    </article>
  );
}

function ProteinPage({ accession, seedProteins, favorites, toggleFavorite, onViewed }) {
  const seeded = seedProteins.find((protein) => protein.accession === accession);
  const [protein, setProtein] = useState(seeded);
  const [status, setStatus] = useState(seeded ? 'ready' : 'loading');
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    let active = true;
    setStatus(seeded ? 'ready' : 'loading');
    fetchProtein(accession)
      .then((item) => {
        if (!active) return;
        setProtein(item);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [accession, seeded]);

  useEffect(() => {
    if (status === 'ready' && protein) onViewed(protein);
  }, [status, protein?.accession]);

  if (status === 'loading') {
    return <section className="detail-shell"><DetailSkeleton /></section>;
  }

  if (status === 'error') {
    return <section className="detail-shell"><ErrorState message={error || 'Protein could not be loaded.'} /></section>;
  }

  if (!protein) {
    return <section className="detail-shell"><EmptyState text="No protein data found." /></section>;
  }

  const isFavorite = favorites.includes(protein.accession);
  const proteinUrl = `${window.location.origin}${window.location.pathname}#/protein/${protein.accession}`;

  async function copyUniProtId() {
    const copied = await writeClipboard(protein.accession);
    setCopyStatus(copied ? 'Copied' : 'Try again');
    window.setTimeout(() => setCopyStatus(''), 1600);
  }

  async function shareProtein() {
    const shareData = {
      title: protein.name,
      text: `${protein.name} on Protein Explorer`,
      url: proteinUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      const copied = await writeClipboard(proteinUrl);
      setShareStatus(copied ? 'Link copied' : 'Try again');
      window.setTimeout(() => setShareStatus(''), 1600);
    } catch {
      setShareStatus('Share cancelled');
      window.setTimeout(() => setShareStatus(''), 1600);
    }
  }

  return (
    <section className="detail-shell">
      <a className="back-link" href="#/"><ArrowLeft size={18} /> Back to discovery</a>
      <div className="detail-hero">
        <div>
          <span className="pill soft">{getSeedTheme(protein.accession)}</span>
          <h1>{protein.name}</h1>
          <ProteinMeta protein={protein} />
          <div className="badge-row">
            <CategoryTags tags={protein.categoryTags} />
          </div>
        </div>
        <div className="detail-actions">
          <button
            className={isFavorite ? 'primary-button favorite active' : 'primary-button favorite'}
            onClick={() => toggleFavorite(protein.accession)}
          >
            <Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Saved' : 'Save'}
          </button>
          <button className="ghost-button" onClick={shareProtein}>
            <Share2 size={18} />
            {shareStatus || 'Share'}
          </button>
        </div>
      </div>

      <div className="detail-layout">
        <article className="detail-main">
          <section>
            <span className="section-kicker">Function</span>
            <h2>What it does</h2>
            <p>{protein.functionText || 'UniProt does not list a concise function summary for this protein.'}</p>
          </section>
          <section>
            <span className="section-kicker">Beginner view</span>
            <h2>A plain-language starting point</h2>
            <p>{protein.beginnerSummary}</p>
          </section>
          {protein.interestingFact && (
            <section className="fact-box">
              <span className="section-kicker">Did you know?</span>
              <h2>A sourced detail</h2>
              <p>{protein.interestingFact.text}</p>
            </section>
          )}
        </article>

        <aside className="detail-side">
          <div className="info-panel">
            <h2>Quick details</h2>
            <dl>
              <div>
                <dt>UniProt ID</dt>
                <dd className="copy-row">
                  {protein.accession}
                  <button className="mini-button" onClick={copyUniProtId}>
                    {copyStatus ? <Check size={15} /> : <Copy size={15} />}
                    {copyStatus || 'Copy'}
                  </button>
                </dd>
              </div>
              <div><dt>Gene</dt><dd>{protein.gene}</dd></div>
              <div><dt>Organism</dt><dd>{protein.organism}</dd></div>
              <div><dt>Length</dt><dd>{protein.sequenceLength ? `${protein.sequenceLength.toLocaleString()} aa` : 'Not listed'}</dd></div>
              <div><dt>Molecular weight</dt><dd>{formatDaltons(protein.molecularWeight)}</dd></div>
            </dl>
          </div>

          <div className="info-panel">
            <h2>Source badges</h2>
            <div className="badge-row source-badges roomy">
              <SourceBadges protein={protein} />
            </div>
          </div>

          <div className="info-panel">
            <h2>Structures</h2>
            <StructureLinks protein={protein} />
          </div>

          <div className="info-panel">
            <h2>Sources and citations</h2>
            <div className="link-stack">
              {protein.sourceLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                  {link.label} <ExternalLink size={15} />
                </a>
              ))}
              {protein.citations.map((citation) => (
                <a key={citation.id} href={citation.href} target="_blank" rel="noreferrer">
                  {citation.label} <ExternalLink size={15} />
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function CategoryTags({ tags = [] }) {
  if (!tags.length) return <span className="tag muted-tag">general protein</span>;
  return tags.map((tag) => <span className="tag category-tag" key={tag}>{tag}</span>);
}

function SourceBadges({ protein }) {
  const badges = protein.sourceBadges ?? ['UniProt'];
  return badges.map((badge) => <span className="tag source-tag" key={badge}>{badge}</span>);
}

function StructureLinks({ protein }) {
  if (!protein.pdbIds.length && !protein.hasAlphaFold) {
    return <p className="muted">No PDB or AlphaFold cross-reference was listed by UniProt for this entry.</p>;
  }

  return (
    <div className="structure-list">
      {protein.hasAlphaFold && (
        <a href={`https://alphafold.ebi.ac.uk/entry/${protein.accession}`} target="_blank" rel="noreferrer">
          <BookOpen size={18} />
          AlphaFold prediction
        </a>
      )}
      {protein.pdbIds.slice(0, 8).map((id) => (
        <a key={id} href={`https://www.rcsb.org/structure/${id}`} target="_blank" rel="noreferrer">
          <Beaker size={18} />
          PDB {id}
        </a>
      ))}
    </div>
  );
}

function ProteinMeta({ protein }) {
  return (
    <div className="protein-meta">
      <span>{protein.organism}</span>
      <span>{protein.gene}</span>
      <span>{protein.accession}</span>
    </div>
  );
}

function LoadingBlock({ label }) {
  return (
    <div className="loading-block">
      <LoaderCircle className="spin" size={28} />
      <span>{label}</span>
    </div>
  );
}

function InlineState({ icon, text }) {
  return (
    <div className="inline-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <Sparkles size={26} />
      <p>{text}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="empty-state error-state">
      <X size={26} />
      <p>{message || 'Something went wrong while loading protein data.'}</p>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <section className="protein-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <article className="protein-card skeleton" key={index}>
          <span />
          <strong />
          <p />
          <p />
        </article>
      ))}
    </section>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="detail-hero skeleton detail-skeleton">
        <div>
          <span />
          <strong />
          <p />
        </div>
      </div>
      <div className="detail-layout">
        <article className="detail-main skeleton detail-skeleton">
          <span />
          <strong />
          <p />
          <p />
        </article>
        <aside className="detail-side">
          <div className="info-panel skeleton detail-skeleton">
            <strong />
            <p />
            <p />
          </div>
        </aside>
      </div>
    </>
  );
}

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const proteinMatch = hash.match(/^\/protein\/([^/]+)$/);
  if (proteinMatch) return { name: 'protein', accession: proteinMatch[1].toUpperCase() };
  const sectionMatch = hash.match(/^\/?(discover|favorites|sources)$/);
  if (sectionMatch) return { name: 'home', section: sectionMatch[1] };
  return { name: 'home' };
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function getOrganismOptions(proteins) {
  return [...new Set(proteins.map((protein) => protein.organism).filter(Boolean))].sort();
}

function mergeProteins(primary, secondary) {
  const merged = new Map();
  for (const protein of [...secondary, ...primary]) {
    if (protein?.accession) merged.set(protein.accession, protein);
  }
  return [...merged.values()];
}

function makeRecentSnapshot(protein) {
  const {
    accession,
    name,
    organism,
    organismScientific,
    gene,
    functionText,
    beginnerSummary,
    sequenceLength,
    molecularWeight,
    pdbIds,
    hasAlphaFold,
    hasInterPro,
    categoryTags,
    sourceBadges,
    interestingFact,
    citations,
    sourceLinks,
  } = protein;

  return {
    accession,
    name,
    organism,
    organismScientific,
    gene,
    functionText,
    beginnerSummary,
    sequenceLength,
    molecularWeight,
    pdbIds,
    hasAlphaFold,
    hasInterPro,
    categoryTags,
    sourceBadges,
    interestingFact,
    citations,
    sourceLinks,
  };
}

async function writeClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

createRoot(document.getElementById('root')).render(<App />);
