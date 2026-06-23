export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InventoryNotFoundError extends AppError {
  constructor(message = "Inventory record not found") {
    super(message, 404, "INVENTORY_NOT_FOUND");
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = "Insufficient stock available") {
    super(message, 409, "INSUFFICIENT_STOCK");
  }
}

export class ReservationNotFoundError extends AppError {
  constructor(message = "Reservation not found") {
    super(message, 404, "RESERVATION_NOT_FOUND");
  }
}

export class ReservationExpiredError extends AppError {
  constructor(message = "Reservation has expired") {
    super(message, 410, "RESERVATION_EXPIRED");
  }
}

export class InvalidReservationStateError extends AppError {
  constructor(message = "Invalid reservation state transition") {
    super(message, 400, "INVALID_RESERVATION_STATE");
  }
}

export class DuplicateRequestError extends AppError {
  constructor(message = "Duplicate request detected") {
    super(message, 409, "DUPLICATE_REQUEST");
  }
}
