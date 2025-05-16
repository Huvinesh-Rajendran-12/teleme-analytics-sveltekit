<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { v7 } from 'uuid';
  import * as jose from 'jose';
  import ChatContainer from '$lib/components/ChatContainer.svelte';
  import type { Params } from '$lib/types';
  import { browser } from '$app/environment';

  let sessionId = v7();
  let params: Params = {
    centre_id: '',
    centre_name: '',
    is_ngo: false,
    sessionId: sessionId,
    auth_token: '',
  };
  let loading = true;

  function restartConversation() {
    sessionId = v7();
    params = {
      ...params,
      sessionId: sessionId
    };
  }

  onMount(async () => {
    if (browser) {
      try {
        // Extract query parameters
        const searchParams = $page.url.searchParams;
        
        const auth_token_url = searchParams.get('auth_token');
        
        // Extract all query parameters from the URL
        let urlParams: Params = {
          centre_id: searchParams.get('centre_id') || '',
          centre_name: searchParams.get('centre_name') || '',
          sessionId,
          is_ngo: false,
          auth_token: auth_token_url || '',
        };
        
        // Add any additional params from the URL
        searchParams.forEach((value, key) => {
          if (key !== 'centre_id') {
            urlParams[key] = value;
          }
        });
        
        let foundToken: string | null = null;
        
        // 1. Check for JWT token in Authorization header (passed via meta tag)
        try {
          const authHeader = document
            .querySelector('meta[name="authorization"]')
            ?.getAttribute('content');
          if (authHeader) {
            const token = authHeader.startsWith('Bearer ')
              ? authHeader.substring(7)
              : authHeader;
            // Auth token found in header meta tag for analytics chat
            foundToken = token;
          }
        } catch (error) {
          console.error(
            'Error accessing Authorization header meta tag:',
            error,
          );
        }
        
        // 2. Fallback: Extract auth_token from query parameters if not found in header
        if (!foundToken && auth_token_url) {
          // Auth token found in URL parameters for analytics chat
          foundToken = auth_token_url;
        }
        
        // Set the token if found
        if (foundToken) {
          urlParams.auth_token = foundToken;
          
          // Verify the token
          if (import.meta.env.VITE_ANALYTICS_JWT_SECRET) {
            try {
              // Use jose library for client-side JWT verification
              const secret = new TextEncoder().encode(
                import.meta.env.VITE_ANALYTICS_JWT_SECRET || ''
              );
              const { payload } = await jose.jwtVerify(foundToken, secret) as {
                payload: {
                  centre_id: string;
                  centre_name: string;
                  is_ngo: boolean;
                  exp: number;
                }
              };
              if (
                payload &&
                payload.centre_id &&
                payload.centre_name
              ) {
                urlParams = {
                  ...urlParams,
                  centre_id: payload.centre_id,
                  centre_name: payload.centre_name,
                  is_ngo: payload.is_ngo,
                  auth_token: foundToken,
                };
              }
            } catch (error) {
              console.error(
                'Failed to decode auth_token or extract centre_id:',
                error,
              );
            }
          }
        } else {
          // Handle case where no token is found
          console.warn(
            'No auth_token found in URL parameters or headers for analytics chat. API calls may fail.',
          );
        }
        
        params = urlParams;
      } catch (error) {
        console.error('Error setting up analytics chat:', error);
      } finally {
        loading = false;
      }
    }
  });
</script>

<main class="w-full h-screen overflow-hidden bg-health-assistant-theme">
  <div class="w-full h-full flex flex-col">
    <div class="flex-grow w-full overflow-hidden shadow-md bg-white border border-gray-100">
      {#if loading}
        <div class="w-full h-full flex items-center justify-center">
          <div class="animate-pulse flex flex-col items-center">
            <div class="h-12 w-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-4"></div>
            <p class="text-gray-700">
              Loading Analytics Chat...
            </p>
          </div>
        </div>
      {:else}
        <ChatContainer {params} onRestartConversation={restartConversation} />
      {/if}
    </div>
  </div>
</main>