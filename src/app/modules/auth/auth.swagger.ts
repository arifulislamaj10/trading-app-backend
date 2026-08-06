export const authSwaggerDocs = {
  "/api/v1/auth/register": {
    post: {
      tags: ["Authentication"],
      summary: "Register a new user",
      description:
        "Create a new user account with email verification. **Note:** Verification email is sent asynchronously (non-blocking) for fast registration. Default role is USER.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "password", "confirmPassword"],
              properties: {
                name: { type: "string", example: "John Doe" },
                email: {
                  type: "string",
                  format: "email",
                  example: "user@example.com",
                },
                password: {
                  type: "string",
                  example: "SecurePass123!",
                  description: "Must be at least 6 characters",
                },
                confirmPassword: {
                  type: "string",
                  example: "SecurePass123!",
                  description: "Must match password",
                },
                referralCode: {
                  type: "string",
                  example: "REF123456",
                  description: "Optional: Referral code from a friend",
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Account created successfully. Verification email sent.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Account created successfully",
                  },
                  statusCode: { type: "integer", example: 201 },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: {
                          type: "string",
                          example: "65f1234567890abcdef12345",
                        },
                        name: { type: "string", example: "John Doe" },
                        email: { type: "string", example: "user@example.com" },
                        role: { type: "string", example: "USER" },
                        isVerified: {
                          type: "boolean",
                          example: false,
                          description: "false until email is verified",
                        },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "Validation error or account already exists" },
      },
    },
  },

  "/api/v1/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Login user",
      description:
        "Authenticate with email and password. **Note:** The `twoFactorCode` field is ONLY required if 2FA is enabled on the account. For normal login, just provide email and password.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "user@example.com",
                },
                password: { type: "string", example: "SecurePass123!" },
                twoFactorCode: {
                  type: "string",
                  pattern: "^\\d{6}$",
                  example: "123456",
                  description:
                    "Optional: Only required if 2FA is enabled on your account",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Login successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "Login successful" },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: {
                        type: "string",
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      },
                      refreshToken: {
                        type: "string",
                        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                      },
                      role: {
                        type: "string",
                        enum: ["USER", "ADMIN", "MASTER"],
                        example: "USER",
                      },
                      requiresTwoFactor: {
                        type: "boolean",
                        example: false,
                        description: "true if 2FA is enabled",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: {
          description: "Invalid credentials or 2FA code required/invalid",
        },
        429: { description: "Too many failed attempts. Account locked." },
      },
    },
  },

  "/api/v1/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Get current user profile",
      description:
        "Retrieve the authenticated user's account information. Requires valid JWT token.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Profile data retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Profile fetched successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      account: {
                        type: "object",
                        properties: {
                          _id: {
                            type: "string",
                            example: "65f1234567890abcdef12345",
                          },
                          name: { type: "string", example: "John Doe" },
                          email: {
                            type: "string",
                            example: "user@example.com",
                          },
                          role: {
                            type: "string",
                            enum: ["USER", "ADMIN", "MASTER"],
                            example: "USER",
                          },
                          isVerified: { type: "boolean", example: true },
                          accountStatus: { type: "string", example: "ACTIVE" },
                          twoFactorEnabled: { type: "boolean", example: false },
                          createdAt: { type: "string", format: "date-time" },
                          updatedAt: { type: "string", format: "date-time" },
                        },
                      },
                      profile: { type: "object", nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: "Unauthorized - Invalid or missing JWT token" },
        404: { description: "Account not found" },
      },
    },
  },

  "/api/v1/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "Logout user",
      description: "Blacklists current tokens and clears refresh token cookie.",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "Logged out successfully" },
        400: { description: "Tokens required for logout" },
      },
    },
  },

  "/api/v1/auth/refresh-token": {
    post: {
      tags: ["Authentication"],
      summary: "Refresh access token",
      description:
        "Get new access token using refresh token from cookie. Note: refreshToken cookie must be present.",
      responses: {
        200: {
          description: "Token refreshed successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Token refreshed successfully",
                  },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        401: { description: "Invalid or expired refresh token" },
      },
    },
  },

  "/api/v1/auth/change-password": {
    post: {
      tags: ["Authentication"],
      summary: "Change password",
      description:
        "Changes the password for the authenticated user. The new password must be at least 8 characters and contain an uppercase letter, a lowercase letter, a number, and a special character.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["oldPassword", "newPassword", "confirmNewPassword"],
              properties: {
                oldPassword: {
                  type: "string",
                  example: "OldPass123!",
                  description: "Current password",
                },
                newPassword: {
                  type: "string",
                  example: "NewSecurePass456!",
                  description:
                    "New password. Min 8 chars, must include uppercase, lowercase, number, and special character.",
                },
                confirmNewPassword: {
                  type: "string",
                  example: "NewSecurePass456!",
                  description: "Must match newPassword exactly.",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Password changed successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Password changed successfully",
                  },
                  data: { type: "null" },
                },
              },
            },
          },
        },
        400: {
          description:
            "Bad Request — Validation failed, passwords do not match, or new password same as old",
        },
        401: {
          description:
            "Unauthorized — Invalid old password or not authenticated",
        },
        404: { description: "Account not found" },
      },
    },
  },

  "/api/v1/auth/forgot-password": {
    post: {
      tags: ["Authentication"],
      summary: "Request password reset",
      description:
        "Sends OTP to email for password reset. Rate limited to 3 requests per hour. **Note:** Email is sent asynchronously (non-blocking).",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "user@example.com",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description:
            "Password reset email sent (always returns success for security)",
        },
        429: { description: "Too many requests. Try again later." },
      },
    },
  },

  "/api/v1/auth/reset-password": {
    post: {
      tags: ["Authentication"],
      summary: "Reset password with OTP",
      description: "Reset password using verification code from email.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "email",
                "verificationCode",
                "newPassword",
                "confirmPassword",
              ],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "user@example.com",
                },
                verificationCode: {
                  type: "string",
                  pattern: "^\\d{6}$",
                  example: "123456",
                },
                newPassword: { type: "string", example: "NewSecurePass456!" },
                confirmPassword: {
                  type: "string",
                  example: "NewSecurePass456!",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Password reset successfully" },
        400: { description: "Invalid/expired code or passwords don't match" },
        404: { description: "Account not found" },
      },
    },
  },

  "/api/v1/auth/verify-email": {
    post: {
      tags: ["Authentication"],
      summary: "Verify email with OTP",
      description:
        "Verify account email using the code sent during registration.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "verificationCode"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "user@example.com",
                },
                verificationCode: {
                  type: "string",
                  pattern: "^\\d{6}$",
                  example: "123456",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Account verified successfully" },
        400: { description: "Invalid or expired verification code" },
        404: { description: "Account not found" },
      },
    },
  },

  "/api/v1/auth/resend-verification": {
    post: {
      tags: ["Authentication"],
      summary: "Resend verification email",
      description: "Request a new verification code to be sent to email.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "user@example.com",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Verification email sent successfully" },
        400: { description: "Account already verified" },
        404: { description: "Account not found" },
      },
    },
  },

  "/api/v1/auth/use-backup-code": {
    post: {
      tags: ["Authentication"],
      summary: "Login with 2FA backup code",
      description: "Use a backup code to login when 2FA device is unavailable.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "backupCode"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  example: "user@example.com",
                },
                backupCode: { type: "string", example: "aB3dE7gH" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Login successful with backup code",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: {
                    type: "string",
                    example: "Login successful with backup code",
                  },
                  data: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      refreshToken: { type: "string" },
                      role: {
                        type: "string",
                        enum: ["USER", "ADMIN", "MASTER"],
                        example: "USER",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "2FA not enabled for this account" },
        401: { description: "Invalid backup code" },
      },
    },
  },

  // 2FA Endpoints
  "/api/v1/auth/2fa/setup": {
    post: {
      tags: ["Two-Factor Authentication"],
      summary: "Setup 2FA",
      description:
        "Initiate 2FA setup. Returns QR code URL and backup codes. Requires password verification.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["password"],
              properties: {
                password: { type: "string", example: "SecurePass123!" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "2FA setup initiated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      secret: {
                        type: "string",
                        description: "TOTP secret (for manual entry)",
                      },
                      qrCodeUrl: {
                        type: "string",
                        description: "QR code URL for authenticator app",
                      },
                      backupCodes: {
                        type: "array",
                        items: { type: "string" },
                        description: "Save these! Shown only once.",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: { description: "2FA already enabled" },
        401: { description: "Invalid password" },
      },
    },
  },

  "/api/v1/auth/2fa/enable": {
    post: {
      tags: ["Two-Factor Authentication"],
      summary: "Enable 2FA",
      description:
        "Enable 2FA after setup by verifying the code from authenticator app.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["twoFactorCode"],
              properties: {
                twoFactorCode: {
                  type: "string",
                  pattern: "^\\d{6}$",
                  example: "123456",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "2FA enabled successfully" },
        400: { description: "Invalid code or 2FA not setup" },
      },
    },
  },

  "/api/v1/auth/2fa/disable": {
    post: {
      tags: ["Two-Factor Authentication"],
      summary: "Disable 2FA",
      description: "Disable 2FA by providing current TOTP code.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["twoFactorCode"],
              properties: {
                twoFactorCode: {
                  type: "string",
                  pattern: "^\\d{6}$",
                  example: "123456",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "2FA disabled successfully" },
        400: { description: "2FA not enabled or invalid code" },
      },
    },
  },
};
