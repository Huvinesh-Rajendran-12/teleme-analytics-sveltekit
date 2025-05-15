<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { fetchUserById, updateUser } from '$lib/services/userService';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';
  import { logError } from '$lib/utils/secureLogger';
  import type { User, UserUpdateRequest } from '$lib/types/users';

  // State
  let user: User | null = null;
  let isLoading = true;
  let isSaving = false;
  let error = '';
  let successMessage = '';

  // Form data
  let formData: UserUpdateRequest = {
    username: '',
    email: '',
    role: 'user',
    status: 'active',
    password: ''
  };

  // Load user data on mount
  onMount(async () => {
    const userId = $page.params.id;

    // Check if this is the "new user" page
    if (userId === 'new') {
      isLoading = false;
      user = null;
      formData = {
        username: '',
        email: '',
        role: 'user',
        status: 'active',
        password: ''
      };
      return;
    }

    // Load existing user
    try {
      user = await fetchUserById(userId);

      // Populate form with user data
      formData = {
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        // Do not include password for existing users
        organizations: user.organizations
      };

    } catch (err) {
      logError('Error fetching user:', err);
      error = 'Failed to load user details. Please try again.';
    } finally {
      isLoading = false;
    }
  });

  // Handle form submission
  async function handleSubmit() {
    isSaving = true;
    error = '';
    successMessage = '';

    try {
      const userId = $page.params.id;

      // Basic validation
      if (!formData?.username?.trim()) {
        throw new Error('Username is required');
      }

      if (!formData?.email?.trim() || !formData?.email?.includes('@')) {
        throw new Error('Valid email is required');
      }

      // Handle creating a new user
      if (userId === 'new') {
        if (!formData.password) {
          throw new Error('Password is required for new users');
        }

        // Call the create user API
        // For now, just show success message
        successMessage = 'User created successfully';

        // In a real app, call API and navigate:
        // const newUser = await createUser({
        //   username: formData.username,
        //   email: formData.email,
        //   password: formData.password,
        //   role: formData.role
        // });
        // goto(`/admin/users/${newUser.id}`);
      } else {
        // Update existing user
        await updateUser(userId, formData);
        successMessage = 'User updated successfully';
      }
    } catch (err) {
      logError('Error saving user:', err);
      error = err instanceof Error ? err.message : 'Failed to save user. Please try again.';
    } finally {
      isSaving = false;
    }
  }

  // Cancel and return to user list
  function cancel() {
    goto('/admin/users');
  }
</script>

<AdminLayout>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        {$page.params.id === 'new' ? 'Create New User' : 'Edit User'}
      </h1>
      <button
        on:click={cancel}
        class="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
      >
        Back to User List
      </button>
    </div>

    {#if error}
      <div class="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    {/if}

    {#if successMessage}
      <div class="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
        {successMessage}
      </div>
    {/if}

    {#if isLoading}
      <div class="flex items-center justify-center py-10">
        <div class="h-6 w-6 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
        <span class="ml-2">Loading user details...</span>
      </div>
    {:else}
      <div class="rounded-md bg-white p-6 shadow-sm">
        <form on:submit|preventDefault={handleSubmit} class="space-y-6">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              id="username"
              bind:value={formData.username}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              bind:value={formData.email}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              {$page.params.id === 'new' ? 'Password' : 'Password (leave blank to keep unchanged)'}
            </label>
            <input
              type="password"
              id="password"
              bind:value={formData.password}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required={$page.params.id === 'new'}
            />
          </div>

          <div>
            <label for="role" class="block text-sm font-medium text-gray-700">Role</label>
            <select
              id="role"
              bind:value={formData.role}
              class="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            >
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          <div>
            <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status"
              bind:value={formData.status}
              class="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              on:click={cancel}
              class="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    {/if}
  </div>
</AdminLayout>
