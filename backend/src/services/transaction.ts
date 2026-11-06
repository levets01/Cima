import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { HttpError } from '../middleware/error.middleware';

/** Retry serialization conflicts so concurrent payments cannot overdraw the same balance. */
export async function inTransaction<T>(operation: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000, timeout: 30_000,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error;
      if (attempt === 2) throw new HttpError('Otra operación modificó los datos. Inténtalo nuevamente.', 409);
    }
  }
  throw new Error('No se pudo completar la transacción');
}
