# Security Specification: TechService Manager

## Data Invariants
1. A **Service Request** cannot exist without a valid `directorId` matching the creator's UID.
2. A **Service Request** must have a status from the predefined list: `NEW`, `APPROVED`, `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CONFIRMED`, `CLOSED`, `REOPENED`.
3. Only an **Admin** can approve a `NEW` request or assign a technician to an `APPROVED` request.
4. Only the **Assigned Technician** can update the status of a request assigned to them (Accept, Start, Complete).
5. Only the **Department Director** who created the request can confirm completion (`CONFIRMED`).
6. All timestamps (`createdAt`, `updatedAt`, `completedAt`, `confirmedAt`) must be server-generated.

## The "Dirty Dozen" (Attack Payloads)

1. **Identity Spoofing**: Attempt to create a request with a `directorId` that is not the current user's UID.
2. **Role Escalation**: A Technician attempting to approve their own requests (setting status to `APPROVED`).
3. **Ghost Field Injection**: Adding an `isVip` field to a `ServiceRequest` during creation/update.
4. **ID Poisoning**: Using a 2MB string as a `requestId` to cause resource exhaustion.
5. **State Skipping**: Moving a `NEW` request directly to `COMPLETED` by a non-admin.
6. **Cross-Tenant Access**: A Dept Director attempting to read or update a request created by another department.
7. **Technician Sabotage**: A Technician attempting to mark a request assigned to someone else as `COMPLETED`.
8. **Admin Bypass**: Attempting to change `assignedTechnicianId` as a Technician.
9. **Timestamp Manipulation**: Sending a manual `createdAt` string in the past.
10. **Shadow Profile Update**: A user attempting to set `role: 'ADMIN'` in their own user profile.
11. **PII Leakage**: Attempting to list all users to see emails/phone numbers without being an Admin.
12. **Relationship Decommissioning**: Deleting a `ServiceRequest` that is `IN_PROGRESS`.

## Test Suite Plan
- Verify `users/{userId}` create/update only by same user.
- Verify `service_requests/{requestId}`:
    - Create: Only DEPT_DIRECTOR, correct schema, correct directorId.
    - Update:
        - Admin only: status=APPROVED, status=ASSIGNED + assignedTechnicianId.
        - Technician only: status=ACCEPTED, status=IN_PROGRESS, status=COMPLETED (if assigned).
        - Director only: status=CONFIRMED (if owner).
- Verify `notifications/{notificationId}`: Only owner can read/mark as read.
