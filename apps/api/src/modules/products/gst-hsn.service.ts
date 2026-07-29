import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const GST_HSN_QSEARCH_URL = 'https://services.gst.gov.in/commonservices/hsn/search/qsearch';
const MAX_RESULTS = 25;
const MAX_SEARCH_TERMS = 6;
const FETCH_TIMEOUT_MS = 10_000;

export type GstHsnMatch = {
  code: string;
  description: string;
};

type GstPortalRow = {
  c?: string;
  n?: string;
  hsnCode?: string;
  description?: string;
};

type SearchParam = { selectedType: 'byDesc' | 'byCode'; category: string };

@Injectable()
export class GstHsnService {
  private readonly logger = new Logger(GstHsnService.name);

  async search(query: string): Promise<GstHsnMatch[]> {
    const input = query.trim();
    if (input.length < 3) return [];

    const searchTerms = this.buildSearchTerms(input);
    const requests: Array<{ term: string; param: SearchParam }> = [];

    for (const term of searchTerms) {
      for (const param of this.paramsForTerm(term)) {
        requests.push({ term, param });
      }
    }

    const seen = new Set<string>();
    const matches: GstHsnMatch[] = [];
    let successCount = 0;
    let lastError: unknown;

    const chunks = this.chunk(requests, 8);
    for (const batch of chunks) {
      const settled = await Promise.allSettled(
        batch.map(async ({ term, param }) => this.fetchPortalRows(term, param)),
      );

      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          successCount += 1;
          for (const row of outcome.value) {
            const code = String(row.c ?? row.hsnCode ?? '').replace(/\D/g, '');
            const description = String(row.n ?? row.description ?? '').trim();
            if (!code || code.length < 4 || seen.has(code)) continue;
            seen.add(code);
            matches.push({ code, description: description || code });
          }
        } else {
          lastError = outcome.reason;
          this.logger.warn(`GST HSN search failed: ${String(outcome.reason)}`);
        }
      }
    }

    if (matches.length === 0 && successCount === 0 && lastError) {
      throw new ServiceUnavailableException(
        'GST portal HSN search is temporarily unavailable. Try again or enter HSN manually.',
      );
    }

    return this.rankMatches(matches, input).slice(0, MAX_RESULTS);
  }

  /** Odoo-style: full phrase, significant tokens, and numeric HSN prefixes. */
  private buildSearchTerms(input: string): string[] {
    const terms: string[] = [];
    const add = (value: string) => {
      const v = value.trim();
      if (v.length >= 3 && !terms.includes(v)) terms.push(v);
    };

    add(input);

    if (/^\d+$/.test(input)) {
      if (input.length > 4) add(input.slice(0, input.length - 1));
      if (input.length > 6) add(input.slice(0, 6));
      if (input.length > 8) add(input.slice(0, 8));
      return terms.slice(0, MAX_SEARCH_TERMS);
    }

    const normalized = input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = normalized
      .split(' ')
      .filter((w) => w.length >= 3 && !/^\d+$/.test(w))
      .sort((a, b) => b.length - a.length);

    for (const word of words) {
      add(word);
      if (terms.length >= MAX_SEARCH_TERMS) break;
    }

    const digits = input.replace(/\D/g, '');
    if (digits.length >= 4) add(digits.slice(0, 4));
    if (digits.length >= 6) add(digits.slice(0, 6));
    if (digits.length >= 8) add(digits.slice(0, 8));

    return terms.slice(0, MAX_SEARCH_TERMS);
  }

  private paramsForTerm(term: string): SearchParam[] {
    if (/^\d+$/.test(term)) {
      return [{ selectedType: 'byCode', category: 'null' }];
    }
    return [
      { selectedType: 'byDesc', category: 'P' },
      { selectedType: 'byDesc', category: 'S' },
    ];
  }

  private async fetchPortalRows(term: string, param: SearchParam): Promise<GstPortalRow[]> {
    const url = new URL(GST_HSN_QSEARCH_URL);
    url.searchParams.set('inputText', term);
    url.searchParams.set('selectedType', param.selectedType);
    url.searchParams.set('category', param.category);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'RetailIMS/1.0',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`GST portal responded with ${response.status}`);
      }

      const payload = (await response.json()) as {
        data?: GstPortalRow[];
        resData?: { data?: GstPortalRow[] };
      };
      return payload.data ?? payload.resData?.data ?? [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private rankMatches(matches: GstHsnMatch[], query: string): GstHsnMatch[] {
    const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const queryWords = normalizedQuery.split(' ').filter((w) => w.length >= 2);
    // Pre-computed once; was being recomputed inside score() on every sort comparison.
    const codeDigits = query.replace(/\D/g, '');

    // Pre-compute scores in O(n*q) so sort comparisons are O(1) instead of O(q) each.
    const scored = matches.map((match) => {
      const desc = match.description.toLowerCase();
      let points = 0;
      if (desc.includes(normalizedQuery)) points += 50;
      for (const word of queryWords) {
        if (desc.includes(word)) points += 10;
      }
      if (codeDigits && match.code.startsWith(codeDigits)) points += 30;
      points += Math.min(match.code.length, 8);
      return { match, points };
    });

    scored.sort((a, b) => b.points - a.points);
    return scored.map(({ match }) => match);
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }
}
