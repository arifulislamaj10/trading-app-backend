/**
 * Centralized user role definitions
 * Use these constants instead of magic strings
 */
export enum UserRole {
  ADMIN = "ADMIN",
  MASTER = "MASTER",
  USER = "USER",
}

export type UserRoleType = `${UserRole}`;

/**
 * Account status definitions
 */
export enum AccountStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export type AccountStatusType = `${AccountStatus}`;
