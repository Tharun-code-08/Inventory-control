import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

type PostalApiOffice = {
  District?: string | null;
  State?: string | null;
  Country?: string | null;
  Block?: string | null;
  Name?: string | null;
};

type PostalApiResponse = {
  Status?: string | null;
  Message?: string | null;
  PostOffice?: PostalApiOffice[] | null;
};

export type PostalCodeLookupResult = {
  postalCode: string;
  city: string;
  district: string;
  state: string;
  country: string;
};

type CachedLookup = {
  value: PostalCodeLookupResult;
  expiresAt: number;
};

const POSTAL_CODE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function normalizeLocationText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function resolveCity(office: PostalApiOffice): string {
  return (
    normalizeLocationText(office.District) ||
    normalizeLocationText(office.Block) ||
    normalizeLocationText(office.Name)
  );
}

@Injectable()
export class PostalCodesService {
  private readonly cache = new Map<string, CachedLookup>();

  async lookup(postalCodeInput: string): Promise<PostalCodeLookupResult> {
    const postalCode = this.normalizePostalCode(postalCodeInput);
    const cached = this.cache.get(postalCode);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    let response: Response;
    try {
      response = await fetch(`https://api.postalpincode.in/pincode/${postalCode}`, {
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw new BadGatewayException('Postal code lookup is unavailable right now.');
    }

    if (!response.ok) {
      throw new BadGatewayException('Postal code lookup is unavailable right now.');
    }

    const payload = (await response.json()) as PostalApiResponse[] | PostalApiResponse;
    const data = this.parseLookupResponse(payload, postalCode);
    this.cache.set(postalCode, {
      value: data,
      expiresAt: Date.now() + POSTAL_CODE_CACHE_TTL_MS,
    });
    return data;
  }

  private normalizePostalCode(value: string): string {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 6);
    if (digits.length !== 6) {
      throw new BadRequestException('Enter a valid 6-digit postal code.');
    }
    return digits;
  }

  private parseLookupResponse(
    payload: PostalApiResponse[] | PostalApiResponse,
    postalCode: string,
  ): PostalCodeLookupResult {
    const rows = Array.isArray(payload) ? payload : [payload];
    const match = rows.find(
      (row) =>
        String(row?.Status ?? '').toUpperCase() === 'SUCCESS' &&
        Array.isArray(row?.PostOffice) &&
        row.PostOffice.length > 0,
    );

    const office = match?.PostOffice?.find(
      (item) => Boolean(resolveCity(item)) && Boolean(normalizeLocationText(item.State)),
    );
    if (!office) {
      throw new NotFoundException('No city found for that postal code.');
    }

    const city = resolveCity(office);
    const state = normalizeLocationText(office.State);
    const country = normalizeLocationText(office.Country) || 'India';

    return {
      postalCode,
      city,
      district: normalizeLocationText(office.District) || city,
      state,
      country,
    };
  }
}
