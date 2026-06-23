import { db } from "../lib/db";
import { inventoryRepository } from "../repositories/inventory.repository";
import { reservationRepository } from "../repositories/reservation.repository";
import { redisService } from "../lib/redis";
import { logger } from "../lib/logger";
import { RESERVATION_EXPIRY_MINUTES, IDEMPOTENCY_TTL_SECONDS } from "../constants";
import {
  InventoryNotFoundError,
  InsufficientStockError,
  ReservationNotFoundError,
  ReservationExpiredError,
  InvalidReservationStateError,
  DuplicateRequestError,
} from "../errors/errors";
import { ReservationWithDetails } from "../types";

export class ReservationService {
  async getReservationById(id: string): Promise<ReservationWithDetails | null> {
    return reservationRepository.getReservationById(id);
  }

  async createReservation(
    inventoryId: string,
    quantity: number,
    idempotencyKey?: string,
    userId?: string | null
  ): Promise<any> {
    if (idempotencyKey) {
      const cached = await redisService.getIdempotencyRecord(idempotencyKey);
      if (cached) {
        logger.info("Idempotent cache hit for createReservation", { idempotencyKey });
        return cached;
      }
    }

    const lockAcquired = await redisService.acquireLock(inventoryId, 5);
    if (!lockAcquired) {
      logger.warn("Could not acquire lock for inventory, duplicate reservation attempt", { inventoryId });
      throw new DuplicateRequestError("This product inventory is currently locked. Please try again shortly.");
    }

    try {
      const reservation = await db.$transaction(async (tx) => {
        // Find inventory
        const inventory = await tx.inventory.findUnique({
          where: { id: inventoryId },
        });
        if (!inventory) {
          throw new InventoryNotFoundError();
        }

        // Atomically increment and check stock
        const success = await inventoryRepository.incrementReservedUnits(inventoryId, quantity, tx);
        if (!success) {
          logger.warn("Inventory check failed: Insufficient stock", { inventoryId, quantity });
          throw new InsufficientStockError();
        }

        const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000);
        return reservationRepository.createReservation(inventoryId, quantity, expiresAt, tx, userId);
      });

      const response = {
        statusCode: 201,
        body: {
          reservationId: reservation.id,
          status: reservation.status,
          expiresAt: reservation.expiresAt,
        },
      };

      if (idempotencyKey) {
        await redisService.setIdempotencyRecord(idempotencyKey, response, IDEMPOTENCY_TTL_SECONDS);
      }

      logger.info("Reservation created successfully", { reservationId: reservation.id });
      return response;
    } finally {
      await redisService.releaseLock(inventoryId);
    }
  }

  async confirmReservation(reservationId: string, idempotencyKey?: string): Promise<any> {
    if (idempotencyKey) {
      const cached = await redisService.getIdempotencyRecord(idempotencyKey);
      if (cached) {
        logger.info("Idempotent cache hit for confirmReservation", { idempotencyKey });
        return cached;
      }
    }

    const reservation = await db.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    const lockAcquired = await redisService.acquireLock(reservation.inventoryId, 5);
    if (!lockAcquired) {
      logger.warn("Could not acquire lock for inventory during confirmation", { inventoryId: reservation.inventoryId });
      throw new DuplicateRequestError("Inventory lock could not be acquired. Please try again.");
    }

    try {
      const result = await db.$transaction(async (tx) => {
        const currentRes = await tx.reservation.findUnique({
          where: { id: reservationId },
        });

        if (!currentRes) {
          throw new ReservationNotFoundError();
        }

        if (currentRes.status === "CONFIRMED") {
          return {
            reservationId: currentRes.id,
            status: currentRes.status,
          };
        }

        if (currentRes.status === "RELEASED") {
          throw new InvalidReservationStateError("Cannot confirm a reservation that has already been released.");
        }

        if (currentRes.expiresAt.getTime() < Date.now()) {
          // Decrement reserved units & release hold
          await inventoryRepository.decrementReservedUnits(currentRes.inventoryId, currentRes.quantity, tx);
          await reservationRepository.updateReservationStatus(currentRes.id, "RELEASED", "EXPIRED", tx);
          logger.warn("Reservation expired, released stock during confirm", { reservationId });
          throw new ReservationExpiredError();
        }

        // Confirm: permanently decrement both total and reserved
        await inventoryRepository.decrementTotalAndReservedUnits(currentRes.inventoryId, currentRes.quantity, tx);
        const updated = await reservationRepository.updateReservationStatus(currentRes.id, "CONFIRMED", null, tx);

        return {
          reservationId: updated.id,
          status: updated.status,
        };
      });

      const response = {
        statusCode: 200,
        body: result,
      };

      if (idempotencyKey) {
        await redisService.setIdempotencyRecord(idempotencyKey, response, IDEMPOTENCY_TTL_SECONDS);
      }

      logger.info("Reservation confirmed successfully", { reservationId });
      return response;
    } finally {
      await redisService.releaseLock(reservation.inventoryId);
    }
  }

  async releaseReservation(reservationId: string): Promise<any> {
    const reservation = await db.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    const lockAcquired = await redisService.acquireLock(reservation.inventoryId, 5);
    if (!lockAcquired) {
      logger.warn("Could not acquire lock for inventory during release", { inventoryId: reservation.inventoryId });
      throw new DuplicateRequestError("Inventory lock could not be acquired. Please try again.");
    }

    try {
      const result = await db.$transaction(async (tx) => {
        const currentRes = await tx.reservation.findUnique({
          where: { id: reservationId },
        });

        if (!currentRes) {
          throw new ReservationNotFoundError();
        }

        if (currentRes.status === "RELEASED") {
          return {
            reservationId: currentRes.id,
            status: currentRes.status,
          };
        }

        if (currentRes.status === "CONFIRMED") {
          throw new InvalidReservationStateError("Cannot release a reservation that has already been confirmed.");
        }

        // Release: return stock
        await inventoryRepository.decrementReservedUnits(currentRes.inventoryId, currentRes.quantity, tx);
        const updated = await reservationRepository.updateReservationStatus(currentRes.id, "RELEASED", "USER_CANCELLED", tx);

        return {
          reservationId: updated.id,
          status: updated.status,
        };
      });

      logger.info("Reservation released early by user request", { reservationId });
      return {
        statusCode: 200,
        body: result,
      };
    } finally {
      await redisService.releaseLock(reservation.inventoryId);
    }
  }

  async cleanupExpiredReservations(): Promise<{ releasedCount: number }> {
    const expired = await reservationRepository.getExpiredReservations(new Date());
    if (expired.length === 0) {
      return { releasedCount: 0 };
    }

    logger.info(`Found ${expired.length} expired reservations to clean up.`);

    let releasedCount = 0;
    for (const reservation of expired) {
      const lockKey = reservation.inventoryId;
      const lockAcquired = await redisService.acquireLock(lockKey, 5);
      if (!lockAcquired) {
        logger.warn("Could not acquire lock for reservation cleanup, skipping for now", { id: reservation.id });
        continue;
      }
      try {
        await db.$transaction(async (tx) => {
          const current = await tx.reservation.findUnique({
            where: { id: reservation.id },
          });
          if (current && current.status === "PENDING") {
            await inventoryRepository.decrementReservedUnits(current.inventoryId, current.quantity, tx);
            await reservationRepository.updateReservationStatus(current.id, "RELEASED", "EXPIRED", tx);
            releasedCount++;
            logger.info("Automatically released expired reservation", { id: current.id });
          }
        });
      } catch (err: any) {
        logger.error("Failed to automatically release expired reservation", { id: reservation.id, error: err.message });
      } finally {
        await redisService.releaseLock(lockKey);
      }
    }
    return { releasedCount };
  }
}

export const reservationService = new ReservationService();
