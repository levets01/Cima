import { HttpError } from '../middleware/error.middleware';

export function positiveInteger(value: unknown, name: string): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new HttpError(`${name} debe ser un entero positivo`, 400);
  }
  return Number(value);
}
