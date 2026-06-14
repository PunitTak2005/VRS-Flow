# REST API Reference

Base URL: `/api`

Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

## Auth

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register a volunteer with profile fields and optional multipart files `profilePicture`, `govIdFile`. |
| POST | `/auth/login` | Public | Login with `email`, `password`, optional `rememberMe`. |
| GET | `/auth/me` | Authenticated | Get current user and volunteer profile. |
| POST | `/auth/forgotpassword` | Public | Send reset OTP to email. |
| POST | `/auth/resetpassword` | Public | Reset password with `email`, `otp`, `newPassword`. |
| POST | `/auth/google` | Public | Demo social-login endpoint for trusted identity payloads. |

## Volunteers

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/volunteer/profile` | Volunteer/Admin token | Get current volunteer profile. |
| PUT | `/volunteer/profile` | Volunteer/Admin token | Update profile, optional multipart `profilePicture`. |
| GET | `/volunteer/events` | Volunteer/Admin token | List current volunteer event registrations. |
| POST | `/volunteer/events/:id/register` | Approved volunteer | Register for an upcoming event. |
| DELETE | `/volunteer/events/:id/cancel` | Volunteer/Admin token | Cancel current volunteer registration. |
| GET | `/volunteer/idcard` | Volunteer/Admin token | Generate and return QR-backed ID card data. |
| PUT | `/volunteer/change-password` | Authenticated | Change current password. |
| DELETE | `/volunteer/delete-account` | Volunteer/Admin token | Delete current volunteer account. |
| GET | `/volunteer/notifications` | Authenticated | List user notifications. |
| PUT | `/volunteer/notifications/:id/read` | Authenticated | Mark notification as read. |

## Events

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/events` | Public | List events. Supports `search`, `category`, `startDate`, `endDate`, `status`. |
| GET | `/events/:id` | Public | Get event details and assigned volunteers. |
| POST | `/events` | Admin | Create event, optional multipart `eventImage`. |
| PUT | `/events/:id` | Admin | Update event details/status. |
| DELETE | `/events/:id` | Admin | Delete event and registrations. |
| PUT | `/events/:id/attendance/:registrationId` | Admin | Set attendance status and hours. |

## Admin

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/admin/stats` | Admin | Dashboard totals and registration trends. |
| GET | `/admin/volunteers` | Admin | Search/filter/sort/paginate volunteers. |
| POST | `/admin/volunteers` | Admin | Create volunteer directly. |
| PUT | `/admin/volunteers/:id` | Admin | Update volunteer. |
| DELETE | `/admin/volunteers/:id` | Admin | Delete volunteer and related records. |
| POST | `/admin/volunteers/bulk-delete` | Admin | Delete volunteers by `ids`. |
| PUT | `/admin/volunteers/:id/status` | Admin | Approve/reject volunteer. |
| POST | `/admin/volunteers/:id/email` | Admin | Send a volunteer email. |
| GET | `/admin/events/:id/participants` | Admin | List event participants. |
| POST | `/admin/events/:id/assign` | Admin | Assign a volunteer to an event. |
| GET | `/admin/categories` | Authenticated | List categories. |
| POST | `/admin/categories` | Admin | Create category. |
| GET | `/admin/skills` | Authenticated | List skills. |
| POST | `/admin/skills` | Admin | Create skill. |
| POST | `/admin/announcements` | Admin | Broadcast notifications to volunteers. |

## Reports

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/reports/:type?format=json` | Admin | Return report JSON. |
| GET | `/reports/:type?format=csv` | Admin | Download CSV. |
| GET | `/reports/:type?format=excel` | Admin | Download Excel workbook. |
| GET | `/reports/:type?format=pdf` | Admin | Download PDF. |

Report types: `volunteers`, `gender`, `age`, `attendance`, `top-volunteers`, `inactive`.

## Health

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | API status and database mode. |
