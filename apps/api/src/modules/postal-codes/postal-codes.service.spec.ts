import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PostalCodesService } from './postal-codes.service';

describe('PostalCodesService', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns city and state for a valid postal code', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          Status: 'Success',
          PostOffice: [
            {
              District: 'Bengaluru',
              State: 'Karnataka',
              Country: 'India',
            },
          ],
        },
      ],
    } as Response);

    const service = new PostalCodesService();

    await expect(service.lookup('560001')).resolves.toEqual({
      postalCode: '560001',
      city: 'Bengaluru',
      district: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches repeat lookups for the same postal code', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          Status: 'Success',
          PostOffice: [
            {
              District: 'Chennai',
              State: 'Tamil Nadu',
              Country: 'India',
            },
          ],
        },
      ],
    } as Response);

    const service = new PostalCodesService();

    await service.lookup('600001');
    await service.lookup('600001');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid postal codes before calling the upstream service', async () => {
    const service = new PostalCodesService();

    await expect(service.lookup('12')).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns not found when no postal data is available', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ Status: 'Error', PostOffice: null }],
    } as Response);

    const service = new PostalCodesService();

    await expect(service.lookup('999999')).rejects.toBeInstanceOf(NotFoundException);
  });
});
