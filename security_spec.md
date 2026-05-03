# Security Specification

## Data Invariants
1. **Booking**: Must have customer name, phone, service type, and a valid status. Status transitions are final when 'Completed'.
2. **Employee**: Must have name, position, and basic salary.
3. **Inventory**: Must have item name and stock level.
4. **Sale**: Must have customer name and total amount.
5. **Expense**: Must have amount and category.
6. **Customer**: Must have name and phone.

## The "Dirty Dozen" Payloads (Attacks)
1. **Identity Spoofing**: Attempt to create a booking with an arbitrary `ownerId` (if we used ownership).
2. **State Shortcutting**: Attempt to update a Booking directly to 'Completed' without going through 'Confirmed' (if enforced).
3. **Resource Poisoning**: Use a 1.5KB string as a `bookingId`.
4. **Shadow Update**: Add a `isVerifiedAdmin: true` field to a user profile or document.
5. **PII Leak**: A non-authenticated user attempting to list `mnf_customers`.
6. **Immutable Field Attack**: Try to change `createdAt` on a sale record.
7. **Type Poisoning**: Sending a string for `amount` in `mnf_sales`.
8. **Unverified Email Access**: An authenticated user with `email_verified: false` trying to write data.
9. **Blanket Read Scam**: Listing all employees without a secure query enforcer.
10. **Orphaned Record**: Creating a sale without verifying if the customer exists (though here they are independent collections in the blueprint).
11. **Denial of Wallet**: Sending a massive array of tags in a document.
12. **Status Bypass**: Updating a 'Completed' booking.

## Test Runner
See `firestore.rules.test.ts` for implementation.
