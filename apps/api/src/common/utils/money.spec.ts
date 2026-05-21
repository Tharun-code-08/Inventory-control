import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  asMoney,
  assertNonNegativeMoney,
  assertPositiveMoney,
  roundMoney,
} from './money';

describe('money utilities', () => {
  describe('asMoney', () => {
    it('accepts numbers, strings, and Decimal', () => {
      expect(asMoney(1.23).toFixed(2)).toBe('1.23');
      expect(asMoney('1.23').toFixed(2)).toBe('1.23');
      expect(asMoney(new Prisma.Decimal('1.23')).toFixed(2)).toBe('1.23');
    });
  });

  describe('roundMoney', () => {
    it('rounds half-up to two decimal places', () => {
      expect(roundMoney(asMoney('1.005')).toFixed(2)).toBe('1.01');
      expect(roundMoney(asMoney('1.004')).toFixed(2)).toBe('1.00');
      expect(roundMoney(asMoney('1.999')).toFixed(2)).toBe('2.00');
    });
  });

  describe('assertPositiveMoney', () => {
    it('passes for strictly positive values', () => {
      expect(() => assertPositiveMoney(asMoney('0.01'), 'amount')).not.toThrow();
    });
    it('rejects zero', () => {
      expect(() => assertPositiveMoney(asMoney(0), 'amount')).toThrow(BadRequestException);
    });
    it('rejects negative', () => {
      expect(() => assertPositiveMoney(asMoney('-0.01'), 'amount')).toThrow(BadRequestException);
    });
  });

  describe('assertNonNegativeMoney', () => {
    it('passes for zero', () => {
      expect(() => assertNonNegativeMoney(asMoney(0), 'balance')).not.toThrow();
    });
    it('rejects negative', () => {
      expect(() => assertNonNegativeMoney(asMoney('-0.01'), 'balance')).toThrow(BadRequestException);
    });
  });
});
