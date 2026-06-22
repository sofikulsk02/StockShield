# Concurrency Strategy

Naive Approach

Request A -> Reads stock = 1
Request B -> Reads stock = 1

Both reserve successfully

Result:
Overselling

Chosen Approach

Use PostgreSQL transactions with row-level locking.

SELECT ... FOR UPDATE

Workflow

1. Start transaction
2. Lock inventory row
3. Validate stock
4. Create reservation
5. Commit transaction

Result:
Only one request can reserve the final unit.
