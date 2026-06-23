import { db } from "../lib/db";
import { Reservation, ReservationStatus, ReleaseReason, ReservationWithDetails } from "../types";

export class ReservationRepository {
  async createReservation(
    inventoryId: string,
    quantity: number,
    expiresAt: Date,
    tx: any,
    userId?: string | null
  ): Promise<Reservation> {
    return tx.reservation.create({
      data: {
        inventoryId,
        quantity,
        expiresAt,
        status: "PENDING",
        userId: userId || null,
      },
    });
  }

  async getReservationById(id: string): Promise<ReservationWithDetails | null> {
    return db.reservation.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
    }) as Promise<ReservationWithDetails | null>;
  }

  async updateReservationStatus(
    id: string,
    status: ReservationStatus,
    releaseReason: ReleaseReason | null,
    tx: any
  ): Promise<Reservation> {
    return tx.reservation.update({
      where: { id },
      data: {
        status,
        releaseReason,
      },
    });
  }

  async getExpiredReservations(now: Date): Promise<Reservation[]> {
    return db.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now,
        },
      },
    });
  }
}

export const reservationRepository = new ReservationRepository();
