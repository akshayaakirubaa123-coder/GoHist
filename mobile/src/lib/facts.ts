import type { LanguageCode } from './languages.ts';
import { API_USER_AGENT } from './wikipedia.ts';

/** One line in a place's key facts, such as "Architect: Gustave Eiffel". */
export type Fact = {
  label: string;
  values: string[];
  /** A page that backs this fact up, when there is a better one than the Wikidata item. */
  url?: string;
};

// The Wikidata properties shown as key facts, in the order they appear.
const FACT_PROPERTIES: { id: string; label: string; kind: 'item' | 'time' | 'height' | 'unesco' }[] = [
  { id: 'P31', label: 'What it is', kind: 'item' },
  { id: 'P571', label: 'Built or founded', kind: 'time' },
  { id: 'P1619', label: 'Opened', kind: 'time' },
  { id: 'P576', label: 'Demolished or closed', kind: 'time' },
  { id: 'P88', label: 'Commissioned by', kind: 'item' },
  { id: 'P84', label: 'Architect', kind: 'item' },
  { id: 'P149', label: 'Architectural style', kind: 'item' },
  { id: 'P186', label: 'Built from', kind: 'item' },
  { id: 'P2048', label: 'Height', kind: 'height' },
  { id: 'P138', label: 'Named after', kind: 'item' },
  { id: 'P1435', label: 'Heritage status', kind: 'item' },
  { id: 'P757', label: 'UNESCO World Heritage Site', kind: 'unesco' },
  { id: 'P793', label: 'Key events', kind: 'item' },
];

// Some properties can have dozens of values; a handful is enough on a phone.
const MAX_VALUES = 6;

const METRE = 'http://www.wikidata.org/entity/Q11573';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type TimeValue = { time: string; precision: number };
type Snak = {
  snaktype: string;
  datavalue?: { value: unknown };
};
type Statement = {
  rank: 'preferred' | 'normal' | 'deprecated';
  mainsnak: Snak;
  qualifiers?: Record<string, Snak[]>;
};
export type WikidataClaims = Record<string, Statement[]>;

/**
 * Writes a Wikidata date the way a reader expects, only as exact as Wikidata
 * knows it: "4 July 1776", "July 1776", "1776", "1770s", "18th century".
 * Years before year 1 get "BC".
 */
export function formatWikidataTime({ time, precision }: TimeValue): string | undefined {
  const match = /^([+-])(\d+)-(\d\d)-(\d\d)/.exec(time);
  if (!match) return undefined;
  const bc = match[1] === '-';
  const year = Number(match[2]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  const era = bc ? ' BC' : '';

  if (precision >= 11 && month && day) return `${day} ${MONTHS[month - 1]} ${year}${era}`;
  if (precision === 10 && month) return `${MONTHS[month - 1]} ${year}${era}`;
  if (precision === 9) return `${year}${era}`;
  if (precision === 8) return `${Math.floor(year / 10) * 10}s${era}`;
  if (precision === 7) return `${ordinal(Math.ceil(year / 100))} century${era}`;
  if (precision === 6) return `${ordinal(Math.ceil(year / 1000))} millennium${era}`;
  return undefined;
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** The statements worth showing: preferred ones if there are any, otherwise all but deprecated ones. */
function bestStatements(statements: Statement[] = []): Statement[] {
  const preferred = statements.filter((statement) => statement.rank === 'preferred');
  const chosen = preferred.length > 0 ? preferred : statements.filter((statement) => statement.rank !== 'deprecated');
  return chosen.filter((statement) => statement.mainsnak.snaktype === 'value');
}

function itemId(snak: Snak | undefined): string | undefined {
  const value = snak?.datavalue?.value as { id?: string } | undefined;
  return value?.id;
}

function timeOf(snak: Snak | undefined): string | undefined {
  const value = snak?.datavalue?.value as TimeValue | undefined;
  return value?.time ? formatWikidataTime(value) : undefined;
}

/** The date a statement applies from, e.g. the year a building was listed, if Wikidata has one. */
function qualifierDate(statement: Statement): string | undefined {
  return timeOf(statement.qualifiers?.P585?.[0]) ?? timeOf(statement.qualifiers?.P580?.[0]);
}

/** Items (e.g. "Q90") that `factsFromClaims` needs names for. */
export function referencedItems(claims: WikidataClaims): string[] {
  const ids = new Set<string>();
  for (const property of FACT_PROPERTIES) {
    if (property.kind !== 'item') continue;
    for (const statement of bestStatements(claims[property.id]).slice(0, MAX_VALUES)) {
      const id = itemId(statement.mainsnak);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Turns a Wikidata item's statements into readable key facts. `labels` maps
 * item IDs to their names; values with no name are left out rather than shown
 * as codes. Dated events and designations get their date in brackets, such as
 * "Grade I listed building (since 1954)".
 */
export function factsFromClaims(claims: WikidataClaims, labels: Map<string, string>): Fact[] {
  const facts: Fact[] = [];
  for (const property of FACT_PROPERTIES) {
    const statements = bestStatements(claims[property.id]).slice(0, MAX_VALUES);
    let values: string[] = [];
    let url: string | undefined;

    if (property.kind === 'item') {
      values = statements.flatMap((statement) => {
        const id = itemId(statement.mainsnak);
        const label = id && labels.get(id);
        if (!label) return [];
        // Wikidata names of things start lowercase ("fort", "Gothic Revival architecture").
        const name = label.charAt(0).toLocaleUpperCase() + label.slice(1);
        const date = qualifierDate(statement);
        if (!date) return [name];
        return [property.id === 'P1435' ? `${name} (since ${date})` : `${name} (${date})`];
      });
    } else if (property.kind === 'time') {
      values = statements.flatMap((statement) => timeOf(statement.mainsnak) ?? []).slice(0, 1);
    } else if (property.kind === 'height') {
      values = statements
        .flatMap((statement) => {
          const value = statement.mainsnak.datavalue?.value as { amount?: string; unit?: string } | undefined;
          if (!value?.amount || value.unit !== METRE) return [];
          return [`${Number(value.amount).toLocaleString('en')} m`];
        })
        .slice(0, 1);
    } else if (property.kind === 'unesco') {
      const id = statements[0]?.mainsnak.datavalue?.value;
      if (typeof id === 'string' && /^[\w-]+$/.test(id)) {
        values = ['Yes'];
        url = `https://whc.unesco.org/en/list/${id.split('-')[0]}`;
      }
    }

    if (values.length > 0) facts.push({ label: property.label, values: dedupe(values), url });
  }
  return facts;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

type Entity = {
  claims?: WikidataClaims;
  labels?: Record<string, { value: string }>;
};

async function getEntities(ids: string[], props: string, languages: string): Promise<Record<string, Entity>> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    origin: '*',
    ids: ids.join('|'),
    props,
    languages,
  });
  const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
    headers: { 'Api-User-Agent': API_USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`www.wikidata.org returned ${response.status}`);
  }
  const body: { entities?: Record<string, Entity> } = await response.json();
  return body.entities ?? {};
}

/**
 * Looks up a place's key facts on Wikidata, with names in `language` (or
 * English when Wikidata has no name in that language).
 */
export async function fetchFacts(wikidataId: string, language: LanguageCode): Promise<Fact[]> {
  const entities = await getEntities([wikidataId], 'claims', language);
  const claims = entities[wikidataId]?.claims ?? {};
  const ids = referencedItems(claims);
  const labels = new Map<string, string>();
  const labelLanguages = [...new Set([language, 'en'])];
  // Wikidata returns at most 50 items per request.
  for (let start = 0; start < ids.length; start += 50) {
    const batch = await getEntities(ids.slice(start, start + 50), 'labels', labelLanguages.join('|'));
    for (const [id, entity] of Object.entries(batch)) {
      const label = labelLanguages.map((code) => entity.labels?.[code]?.value).find(Boolean);
      if (label) labels.set(id, label);
    }
  }
  return factsFromClaims(claims, labels);
}
