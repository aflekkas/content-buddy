-- rls_auto_enable is an event trigger handler (wired to the `ensure_rls` trigger).
-- It must never be callable by users via REST (/rest/v1/rpc/rls_auto_enable).
-- Revoke execute from all public-facing roles; the trigger fires internally as the function owner.

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

comment on function public.rls_auto_enable() is 'Event trigger handler for ensure_rls; not callable via RPC.';
