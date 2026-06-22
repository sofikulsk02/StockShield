# StockShield

## Problem

Build a multi-warehouse inventory reservation system that prevents overselling.

Users can:

- View inventory across warehouses
- Reserve stock
- Confirm reservations
- Release reservations

The system must guarantee that when multiple users attempt to reserve the last available unit simultaneously, only one reservation succeeds.

## Key Challenges

- Concurrent requests
- Reservation expiry
- Inventory consistency
- Preventing overselling
