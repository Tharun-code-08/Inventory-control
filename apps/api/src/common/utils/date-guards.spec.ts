import { BadRequestException } from '@nestjs/common';
import { assertFuture, assertNotFuture } from './date-guards';

describe('date-guards', () => {
  describe('assertNotFuture', () => {
    it('accepts today', () => {
      expect(() => assertNotFuture(new Date())).not.toThrow();
    });
    it('accepts past dates', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(() => assertNotFuture(yesterday)).not.toThrow();
    });
    it('rejects strictly future dates', () => {
      const tomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000);
      expect(() => assertNotFuture(tomorrow)).toThrow(BadRequestException);
    });
    it('uses the provided field name', () => {
      const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
      try {
        assertNotFuture(future, 'GR date');
        fail('expected throw');
      } catch (err) {
        expect((err as Error).message).toContain('GR date');
      }
    });
  });

  describe('assertFuture', () => {
    it('rejects today', () => {
      expect(() => assertFuture(new Date())).toThrow(BadRequestException);
    });
    it('accepts tomorrow', () => {
      const tomorrow = new Date(Date.now() + 36 * 60 * 60 * 1000);
      expect(() => assertFuture(tomorrow)).not.toThrow();
    });
    it('rejects yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(() => assertFuture(yesterday)).toThrow(BadRequestException);
    });
  });
});

describe('date-guards across timezones', () => {
  afterEach(() => jest.useRealTimers());

  it("accepts an IST user's today while UTC is still on yesterday", () => {
    // 02:00 IST on 22 Oct is 20:30 UTC on 21 Oct.
    jest.useFakeTimers().setSystemTime(new Date('2026-10-21T20:30:00Z'));
    expect(() => assertNotFuture(new Date('2026-10-22'))).not.toThrow();
    expect(() => assertNotFuture(new Date('2026-10-24'))).toThrow(BadRequestException);
  });
});
