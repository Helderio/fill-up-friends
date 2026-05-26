
-- 1) Restrict device_id column from public reads on reports
REVOKE SELECT ON public.reports FROM anon, authenticated;
GRANT SELECT (id, station_id, fuel_type, status, price_kz, queue_minutes, note, source, created_at, user_id) ON public.reports TO anon, authenticated;
GRANT SELECT (device_id) ON public.reports TO service_role;

-- 2) Prevent admins from changing their own role row
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND COALESCE(NEW.user_id, OLD.user_id) = auth.uid() THEN
    RAISE EXCEPTION 'admins cannot modify their own role assignment';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS user_roles_no_self_change ON public.user_roles;
CREATE TRIGGER user_roles_no_self_change
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

-- 3) Lock down EXECUTE on SECURITY DEFINER functions
-- has_role and is_station_manager are used inside RLS policies for authenticated users; keep authenticated, drop anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_station_manager(uuid, uuid) FROM PUBLIC, anon;

-- Trigger-only functions: revoke from everyone except owner/service_role
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_report() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_role_change() FROM PUBLIC, anon, authenticated;
