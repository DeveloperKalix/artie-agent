import { query } from '@/lib/api/query';

/**
 * Remove a bank connection from Plaid.
 *
 * Backend should call Plaid `/item/remove` with the stored `access_token` for the Item
 * that owns this account. Plaid does not support deleting a single account within an Item;
 * removing the Item revokes access to all accounts under that institution login.
 *
 * `DELETE /api/v1/plaid/accounts`
 */
export function deletePlaidAccount(
  token: string,
  body: {
    user_id: string;
    /** Plaid `account_id` */
    account_id: string;
    /** Plaid `item_id` — helps the backend locate the Item / access_token */
    item_id?: string;
  },
) {
  return query<{ success?: boolean; message?: string }>('/api/v1/plaid/accounts', {
    method: 'DELETE',
    token,
    body,
  });
}
