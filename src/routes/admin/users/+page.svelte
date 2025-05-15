<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchUsers, deleteUser } from '$lib/services/userService';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import { goto } from '$app/navigation';
  import { logError } from '$lib/utils/secureLogger';
  import type { User } from '$lib/types/users';

  // State
  let users: User[] = [];
  let isLoading = true;
  let error = '';
  let totalUsers = 0;
  let currentPage = 1;
  let totalPages = 1;
  let pageSize = 10;

  // Pagination
  function handlePageChange(pageNum: number) {
    if (pageNum < 1 || pageNum > totalPages || pageNum === currentPage) return;
    currentPage = pageNum;
    loadUsers();
  }

  // Load users on mount
  onMount(() => {
    loadUsers();
  });

  async function loadUsers() {
    isLoading = true;
    error = '';

    try {
      const response = await fetchUsers(currentPage, pageSize);
      users = response.users;
      totalUsers = response.total;
      totalPages = response.totalPages;
      currentPage = response.page;
    } catch (err) {
      logError('Error fetching users:', err);
      error = 'Failed to load users. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  // Handle user deletion
  async function handleDeleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteUser(userId);
      // Reload users
      loadUsers();
    } catch (err) {
      logError('Error deleting user:', err);
      error = 'Failed to delete user. Please try again.';
    }
  }

  // Format date
  function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  // Navigate to user details
  function viewUser(userId: string) {
    goto(`/admin/users/${userId}`);
  }

  // Create new user
  function createUser() {
    goto('/admin/users/new');
  }
</script>

<AdminLayout>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">User Management</h1>
      <button
        on:click={createUser}
        class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Create User
      </button>
    </div>

    {#if error}
      <div class="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    {/if}

    {#if isLoading}
      <div class="flex items-center justify-center py-10">
        <div class="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
        <span class="ml-2">Loading users...</span>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Username
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Last Login
              </th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            {#if users.length === 0}
              <tr>
                <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                  No users found.
                </td>
              </tr>
            {:else}
              {#each users as user}
                <tr class="hover:bg-gray-50">
                  <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {user.username}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <span class={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'user'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <span class={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : user.status === 'inactive'
                          ? 'bg-gray-100 text-gray-800'
                          : user.status === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      on:click={() => viewUser(user.id)}
                      class="mr-2 text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      on:click={() => handleDeleteUser(user.id)}
                      class="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div class="text-sm text-gray-700">
            Showing <span class="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span class="font-medium">{Math.min(currentPage * pageSize, totalUsers)}</span> of <span class="font-medium">{totalUsers}</span> users
          </div>
          <div class="flex">
            <button
              on:click={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              class="relative mr-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              on:click={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              class="relative ml-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</AdminLayout>
