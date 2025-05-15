import axios from 'axios';
import type { 
  User, 
  UserListResponse, 
  UserCreateRequest, 
  UserUpdateRequest,
  LoginRequest,
  LoginResponse
} from '$lib/types/users';
import { logDebug, logError } from '$lib/utils/secureLogger';
import { getStoredAdminToken } from '$lib/utils/auth';
import { browser } from '$app/environment';

// N8N webhook URL for user management
let N8N_USER_MANAGEMENT_WEBHOOK_URL = '';

// Initialize environment variables if in browser
if (browser) {
  N8N_USER_MANAGEMENT_WEBHOOK_URL = 
    import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL || 
    "https://teleme-n8n.teleme.co/webhook/ai-admin";
  
  logDebug("N8N_USER_MANAGEMENT_WEBHOOK_URL:", N8N_USER_MANAGEMENT_WEBHOOK_URL);
}

/**
 * Fetch all users with pagination
 * @param page Page number (default: 1)
 * @param pageSize Number of users per page (default: 10)
 * @returns List of users with pagination info
 */
export async function fetchUsers(
  page: number = 1,
  pageSize: number = 10
): Promise<UserListResponse> {
  try {
    logDebug("======== FETCH USERS ========");
    logDebug(`fetchUsers called at ${new Date().toISOString()}`);
    logDebug("Parameters:", { page, pageSize });

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "list_users",
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    // Build the URL with parameters
    const url = `${N8N_USER_MANAGEMENT_WEBHOOK_URL}?${params.toString()}`;
    logDebug(`Calling N8N user management webhook: ${url}`);

    // Add authorization header with admin token
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    logDebug("Request headers:", headers);
    const response = await axios.get(url, { headers });
    
    // Mock data handling - if N8N doesn't have user management implemented yet
    // This allows the UI to be built before backend support exists
    if (!response.data || !response.data.users) {
      logDebug("No real user data received, returning mock data");
      const mockUsers = generateMockUsers(pageSize);
      return {
        users: mockUsers,
        total: 35, // Mock total count
        page,
        pageSize,
        totalPages: Math.ceil(35 / pageSize)
      };
    }

    logDebug("Users fetched successfully:", response.data.users.length || 0, "users");
    return response.data;
  } catch (error) {
    logError("Error fetching users:", error);
    
    // For development, return mock data if API fails
    if (import.meta.env.DEV) {
      logDebug("DEV environment - returning mock user data after error");
      const mockUsers = generateMockUsers(10);
      return {
        users: mockUsers,
        total: 35,
        page: 1,
        pageSize: 10,
        totalPages: 4
      };
    }
    
    throw error;
  }
}

/**
 * Fetch a user by ID
 * @param userId User ID to fetch
 * @returns User details
 */
export async function fetchUserById(userId: string): Promise<User> {
  try {
    logDebug("======== FETCH USER BY ID ========");
    logDebug(`fetchUserById called at ${new Date().toISOString()}`);
    logDebug("userId:", userId);

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "get_user",
      userId,
    });

    // Build the URL with parameters
    const url = `${N8N_USER_MANAGEMENT_WEBHOOK_URL}?${params.toString()}`;
    logDebug(`Calling N8N user management webhook: ${url}`);

    // Add authorization header with admin token
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    logDebug("Request headers:", headers);
    const response = await axios.get(url, { headers });
    
    // Handle mock data if needed
    if (!response.data || !response.data.id) {
      logDebug("No real user data received, returning mock data");
      return generateMockUser(userId);
    }

    logDebug("User fetched successfully:", response.data.id);
    return response.data;
  } catch (error) {
    logError("Error fetching user by ID:", error);
    
    // For development, return mock data if API fails
    if (import.meta.env.DEV) {
      logDebug("DEV environment - returning mock user data after error");
      return generateMockUser(userId);
    }
    
    throw error;
  }
}

/**
 * Create a new user
 * @param userData User data to create
 * @returns Created user
 */
export async function createUser(userData: UserCreateRequest): Promise<User> {
  try {
    logDebug("======== CREATE USER ========");
    logDebug(`createUser called at ${new Date().toISOString()}`);
    logDebug("userData:", { ...userData, password: '******' });

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "create_user",
    });

    // Build the URL with parameters
    const url = `${N8N_USER_MANAGEMENT_WEBHOOK_URL}?${params.toString()}`;
    logDebug(`Calling N8N user management webhook: ${url}`);

    // Add authorization header with admin token
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    logDebug("Request headers:", headers);
    const response = await axios.post(url, userData, { headers });
    
    // Handle mock data if needed
    if (!response.data || !response.data.id) {
      logDebug("No real user data received, returning mock data");
      return {
        id: Math.random().toString(36).substring(7),
        username: userData.username,
        email: userData.email,
        role: userData.role || 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
        organizations: userData.organizations || []
      };
    }

    logDebug("User created successfully:", response.data.id);
    return response.data;
  } catch (error) {
    logError("Error creating user:", error);
    throw error;
  }
}

/**
 * Update an existing user
 * @param userId User ID to update
 * @param userData User data to update
 * @returns Updated user
 */
export async function updateUser(userId: string, userData: UserUpdateRequest): Promise<User> {
  try {
    logDebug("======== UPDATE USER ========");
    logDebug(`updateUser called at ${new Date().toISOString()}`);
    logDebug("userId:", userId);
    logDebug("userData:", { ...userData, password: userData.password ? '******' : undefined });

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "update_user",
      userId,
    });

    // Build the URL with parameters
    const url = `${N8N_USER_MANAGEMENT_WEBHOOK_URL}?${params.toString()}`;
    logDebug(`Calling N8N user management webhook: ${url}`);

    // Add authorization header with admin token
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    logDebug("Request headers:", headers);
    const response = await axios.put(url, userData, { headers });
    
    // Handle mock data if needed
    if (!response.data || !response.data.id) {
      logDebug("No real user data received, returning mock data");
      const mockUser = generateMockUser(userId);
      return {
        ...mockUser,
        ...userData,

      };
    }

    logDebug("User updated successfully:", response.data.id);
    return response.data;
  } catch (error) {
    logError("Error updating user:", error);
    throw error;
  }
}

/**
 * Delete a user
 * @param userId User ID to delete
 * @returns Success status
 */
export async function deleteUser(userId: string): Promise<{ success: boolean, message: string }> {
  try {
    logDebug("======== DELETE USER ========");
    logDebug(`deleteUser called at ${new Date().toISOString()}`);
    logDebug("userId:", userId);

    const token = getStoredAdminToken();
    logDebug("Token available for API call:", Boolean(token));

    if (!token) {
      logError("No authentication token found - cannot proceed with API call");
      throw new Error("Authentication required. Please login as admin.");
    }

    // Prepare URL parameters
    const params = new URLSearchParams({
      action: "delete_user",
      userId,
    });

    // Build the URL with parameters
    const url = `${N8N_USER_MANAGEMENT_WEBHOOK_URL}?${params.toString()}`;
    logDebug(`Calling N8N user management webhook: ${url}`);

    // Add authorization header with admin token
    const headers = {
      Authorization: `Bearer ${token}`
    };

    logDebug("Request headers:", headers);
    const response = await axios.delete(url, { headers });
    
    // Handle mock data if needed
    if (!response.data) {
      logDebug("No real response received, returning mock success");
      return {
        success: true,
        message: 'User deleted successfully'
      };
    }

    logDebug("User deleted successfully");
    return response.data;
  } catch (error) {
    logError("Error deleting user:", error);
    
    // For development, return mock success if API fails
    if (import.meta.env.DEV) {
      logDebug("DEV environment - returning mock success after error");
      return {
        success: true,
        message: 'User deleted successfully (mock)'
      };
    }
    
    throw error;
  }
}

/**
 * User login function
 * @param credentials Login credentials
 * @returns Login response with token
 */
export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    logDebug("======== USER LOGIN ========");
    logDebug(`loginUser called at ${new Date().toISOString()}`);
    logDebug("username provided:", Boolean(credentials.username));
    logDebug("password provided:", Boolean(credentials.password));

    // For user login, we use the standard auth endpoint
    const url = '/api/auth/login';
    logDebug(`Calling auth endpoint: ${url}`);

    const response = await axios.post(url, credentials);
    
    logDebug("Login response received:", {
      success: response.data?.success || false,
      hasToken: Boolean(response.data?.token),
      hasUser: Boolean(response.data?.user)
    });

    return response.data;
  } catch (error) {
    logError("Error during user login:", error);
    
    if (axios.isAxiosError(error) && error.response) {
      // Return the error response data from the server
      return error.response.data as LoginResponse;
    }
    
    // Generic error
    return {
      success: false,
      message: 'Login failed due to a network or server error'
    };
  }
}

// Helper function to generate mock users for development and testing
function generateMockUsers(count: number): User[] {
  const users: User[] = [];
  const roles: Array<'admin' | 'user' | 'guest'> = ['admin', 'user', 'guest'];
  const statuses: Array<'active' | 'inactive' | 'suspended' | 'pending'> = [
    'active', 'inactive', 'suspended', 'pending'
  ];
  
  for (let i = 0; i < count; i++) {
    const id = `user-${Math.random().toString(36).substring(7)}`;
    users.push({
      id,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: roles[Math.floor(Math.random() * roles.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      lastLogin: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : undefined,
      organizations: Math.random() > 0.5 ? ['Teleme'] : [],
      preferences: Math.random() > 0.7 ? {
        theme: Math.random() > 0.5 ? 'dark' : 'light',
        language: 'en',
        notifications: Math.random() > 0.5,
      } : undefined
    });
  }
  
  return users;
}

// Helper function to generate a single mock user
function generateMockUser(userId: string): User {
  const roles: Array<'admin' | 'user' | 'guest'> = ['admin', 'user', 'guest'];
  const statuses: Array<'active' | 'inactive' | 'suspended' | 'pending'> = [
    'active', 'inactive', 'suspended', 'pending'
  ];

  return {
    id: userId,
    username: `user_${userId.substring(0, 5)}`,
    email: `user_${userId.substring(0, 5)}@example.com`,
    role: roles[Math.floor(Math.random() * roles.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    lastLogin: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 1000000000).toISOString() : undefined,
    organizations: Math.random() > 0.5 ? ['Teleme'] : [],
    preferences: Math.random() > 0.7 ? {
      theme: Math.random() > 0.5 ? 'dark' : 'light',
      language: 'en',
      notifications: Math.random() > 0.5,
    } : undefined
  };
}