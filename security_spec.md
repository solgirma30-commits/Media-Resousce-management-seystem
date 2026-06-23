# Security Audit Specification

## 1. Data Invariants
- Users can only read their own profile and notifications.
- Department Directors can only create Service/Camera/Vehicle requests for their department.
- Technicians can only update Service Requests assigned to them.
- Admin can access everything.
- No user can create or update a user with a `SYSTEM_ADMIN` role unless they are the system admin.
- All requests must have a valid `requestId` and `createdAt`.

## 2. The "Dirty Dozen" Payloads (Examples)
1. { "role": "SYSTEM_ADMIN" } (User tries to escalate privileges)
2. { "isVip": true } (User tries to inject privileged field)
3. { "requestId": "..." } (User tries to update requestId field)
4. { "createdAt": "..." } (User tries to change createdAt)
5. { "status": "COMPLETED" } (Technician tries to set status to invalid state)
6. { "directorId": "other_user" } (Director tries to create request for another director)
7. { "email": "admin@company.com" } (User tries to impersonate admin email)
8. { "uid": "other_id" } (User tries to change their own uid)
9. { "status": "NEW" } (Director tries to update status to NEW after already SUBMITTED)
10. { "role": "INVALID" } (User tries to set invalid role)
11. { "priority": "CRITICAL" } (User tries to inject higher priority)
12. { "assignedTechnicianId": "wrong_id" } (Technician tries to assign to someone else)

## 3. Test Runner (firestore.rules.test.ts placeholder)
(To be implemented: A complete set of tests using `firebase-rules-unit-testing`)
