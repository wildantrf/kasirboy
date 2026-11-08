import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

export interface EmailSignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface BusinessOnboardingInput {
  businessName: string;
  branchName: string;
  branchAddress?: string;
  branchTimezone?: string;
}

export async function signUpWithEmail(
  input: EmailSignUpInput,
): Promise<{ userId: string | null; emailConfirmationRequired: boolean }> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { display_name: input.name.trim() } },
  });

  if (error) {
    throw error;
  }

  return {
    userId: data.user?.id ?? null,
    emailConfirmationRequired: !data.session,
  };
}

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw error;
  }
  if (!data.session) {
    throw new Error('Sign-in completed without an authenticated session.');
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) {
    throw error;
  }
}

export async function createBusinessWithBranch(
  input: BusinessOnboardingInput,
): Promise<{ businessId: string; branchId: string }> {
  const { data, error } = await getSupabaseClient().rpc('create_business_with_branch', {
    business_name: input.businessName.trim(),
    branch_name: input.branchName.trim(),
    branch_address: input.branchAddress?.trim() ?? '',
    branch_timezone: input.branchTimezone?.trim() || 'Asia/Jakarta',
  });

  if (error) {
    throw error;
  }

  const created = data?.[0];
  if (!created) {
    throw new Error('Backend onboarding returned no business and branch IDs.');
  }

  return { businessId: created.business_id, branchId: created.branch_id };
}
