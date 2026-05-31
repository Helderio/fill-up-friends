-- 1) Revoke public access to stations.submitted_by_device_id (mirrors reports.device_id)
REVOKE SELECT ON public.stations FROM anon, authenticated;

GRANT SELECT (
  id, name, brand, address, province, lat, lng, status,
  confirmations_count, submitted_by_user_id, created_at
) ON public.stations TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.stations TO authenticated;
GRANT ALL ON public.stations TO service_role;

-- 2) Defense-in-depth: WITH CHECK against self role modification on user_roles
DROP POLICY IF EXISTS roles_admin_write ON public.user_roles;

CREATE POLICY roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND user_id <> auth.uid());

CREATE POLICY roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND user_id <> auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND user_id <> auth.uid());

CREATE POLICY roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND user_id <> auth.uid());

-- 3) Allow admins to delete station_manager_requests for data lifecycle management
CREATE POLICY manager_req_admin_delete ON public.station_manager_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
