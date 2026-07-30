export const userSwaggerDocs = {
    "/api/v1/user/update-profile": {
        patch: {
            tags: ["Users"],
            summary: "Update user profile",
            description:
                "Updates the authenticated user's profile information. To update the profile image, first upload the image via the Upload module (`POST /api/v1/upload/file`), then pass the returned URL as `userProfileUrl` in this endpoint. Accessible by ADMIN, USER, and MASTER roles.",
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                name: {
                                    type: "string",
                                    description: "User's full name",
                                    example: "John Doe",
                                },
                                userProfileUrl: {
                                    type: "string",
                                    format: "uri",
                                    description: "URL of the profile image. Obtain this by first uploading an image to POST /api/v1/upload/file.",
                                    example: "https://your-bucket.s3.your-region.amazonaws.com/uploads/profile_abc123.jpg",
                                },
                                referralCode: {
                                    type: "string",
                                    description: "Unique referral code (3-20 chars, uppercase alphanumeric and underscores). Note: Can only be changed ONCE.",
                                    example: "MY_TRADING_CODE_2024",
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "User profile updated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Profile update successful." },
                                    data: {
                                        type: "object",
                                        properties: {
                                            _id: { type: "string", example: "64b2e1b9d1234f0012ab5678" },
                                            name: { type: "string", example: "John Doe" },
                                            email: { type: "string", example: "john@example.com" },
                                            referralCode: { type: "string", example: "MY_TRADING_CODE_2024" },
                                            userProfileUrl: {
                                                type: "string",
                                                example: "https://your-bucket.s3.your-region.amazonaws.com/uploads/profile_abc123.jpg",
                                            },
                                            role: { type: "string", enum: ["USER", "ADMIN", "MASTER"], example: "USER" },
                                            accountStatus: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], example: "ACTIVE" },
                                            walletBalance: { type: "integer", example: 1000 },
                                            updatedAt: {
                                                type: "string",
                                                example: "2025-10-10T10:00:00Z",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                400: { description: "Bad Request — Validation failed" },
                401: { description: "Unauthorized — must be logged in as ADMIN, USER, or MASTER" },
            },
        },
    },
    "/api/v1/user/": {
        get: {
            tags: ["Users"],
            summary: "Get all users",
            description: "Retrieve all users with pagination. Requires ADMIN role.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "page",
                    in: "query",
                    schema: { type: "integer", default: 1 },
                    description: "Page number",
                },
                {
                    name: "limit",
                    in: "query",
                    schema: { type: "integer", default: 10 },
                    description: "Items per page",
                },
            ],
            responses: {
                200: {
                    description: "Users retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "Users retrieved successfully" },
                                    meta: {
                                        type: "object",
                                        properties: {
                                            page: { type: "integer", example: 1 },
                                            limit: { type: "integer", example: 10 },
                                            total: { type: "integer", example: 100 },
                                            totalPage: { type: "integer", example: 10 },
                                        },
                                    },
                                    data: {
                                        type: "array",
                                        items: { type: "object" },
                                    },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized — ADMIN role required" },
            },
        },
    },
    "/api/v1/user/{id}": {
        get: {
            tags: ["Users"],
            summary: "Get single user",
            description: "Retrieve a single user by ID. Requires ADMIN role.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "User ID",
                },
            ],
            responses: {
                200: {
                    description: "User retrieved successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "User details retrieved successfully" },
                                    data: { type: "object" },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized — ADMIN role required" },
            },
        },
        patch: {
            tags: ["Users"],
            summary: "Update user account status",
            description: "Update a user's account status (ACTIVE or SUSPENDED). Requires ADMIN role.",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "User ID",
                },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["status"],
                            properties: {
                                status: {
                                    type: "string",
                                    enum: ["ACTIVE", "SUSPENDED"],
                                    example: "SUSPENDED",
                                    description: "New account status",
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "User status updated successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "User status updated to SUSPENDED" },
                                    data: { type: "object" },
                                },
                            },
                        },
                    },
                },
                400: { description: "Bad Request — Invalid status or missing status field" },
                401: { description: "Unauthorized — ADMIN role required" },
                404: { description: "User not found" },
            },
        },
        delete: {
            tags: ["Users"],
            summary: "Delete user",
            description: "Soft delete a user by ID. This operation marks the user as deleted rather than permanently removing them. Requires ADMIN role. Request body must include confirmation: \"DELETE\".",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "User ID to delete",
                },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["confirmation"],
                            properties: {
                                confirmation: {
                                    type: "string",
                                    enum: ["DELETE"],
                                    example: "DELETE",
                                    description: "Must be the exact string DELETE to confirm deletion",
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "User deleted successfully",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: { type: "boolean", example: true },
                                    message: { type: "string", example: "User deleted successfully" },
                                    data: { type: "null", example: null },
                                },
                            },
                        },
                    },
                },
                401: { description: "Unauthorized — ADMIN role required" },
                404: { description: "User not found" },
            },
        },
    },
};
