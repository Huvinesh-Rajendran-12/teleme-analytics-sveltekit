import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
  // Keep all query parameters when redirecting
  throw redirect(301, `/health-tracker-summary${url.search}`);
};