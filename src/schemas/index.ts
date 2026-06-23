import { z } from "zod";

export const CreateReservationSchema = z.object({
  inventoryId: z.string({
    required_error: "Inventory ID is required",
  }).cuid("Invalid inventory ID format"),
  quantity: z.number({
    required_error: "Quantity is required",
  })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than zero"),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
