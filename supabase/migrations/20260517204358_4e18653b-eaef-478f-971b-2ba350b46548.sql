
-- 1. Add status + submitter fields to stations
CREATE TYPE public.station_approval AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE public.stations
  ADD COLUMN status public.station_approval NOT NULL DEFAULT 'pending',
  ADD COLUMN submitted_by_user_id UUID,
  ADD COLUMN submitted_by_device_id TEXT,
  ADD COLUMN confirmations_count INTEGER NOT NULL DEFAULT 0;

-- Existing seed rows are real stations -> mark approved
UPDATE public.stations SET status = 'approved' WHERE status = 'pending';

CREATE INDEX stations_status_idx ON public.stations(status);

-- 2. Add source to reports
CREATE TYPE public.report_source AS ENUM ('community', 'official');
ALTER TABLE public.reports
  ADD COLUMN source public.report_source NOT NULL DEFAULT 'community';
CREATE INDEX reports_source_idx ON public.reports(station_id, fuel_type, source, created_at DESC);

-- 3. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'station_owner';

-- 4. Station managers
CREATE TABLE public.station_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, station_id)
);
CREATE INDEX station_managers_user_idx ON public.station_managers(user_id);
CREATE INDEX station_managers_station_idx ON public.station_managers(station_id);

ALTER TABLE public.station_managers ENABLE ROW LEVEL SECURITY;

-- 5. Manager access requests
CREATE TABLE public.station_manager_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
  station_name_hint TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  proof TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX station_manager_requests_user_idx ON public.station_manager_requests(user_id);
CREATE INDEX station_manager_requests_status_idx ON public.station_manager_requests(status);

ALTER TABLE public.station_manager_requests ENABLE ROW LEVEL SECURITY;

-- 6. Security-definer: is the user a manager of a given station?
CREATE OR REPLACE FUNCTION public.is_station_manager(_user_id UUID, _station_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.station_managers
    WHERE user_id = _user_id AND station_id = _station_id
  )
$$;

-- 7. Drop and recreate stations RLS to scope public reads to approved
DROP POLICY IF EXISTS "stations_public_read" ON public.stations;
DROP POLICY IF EXISTS "stations_admin_write" ON public.stations;

CREATE POLICY "stations_approved_read" ON public.stations
  FOR SELECT USING (
    status = 'approved'
    OR submitted_by_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "stations_anyone_submit" ON public.stations
  FOR INSERT WITH CHECK (
    status = 'pending'
    AND (
      (submitted_by_user_id IS NULL AND submitted_by_device_id IS NOT NULL AND length(submitted_by_device_id) >= 6)
      OR submitted_by_user_id = auth.uid()
    )
  );

CREATE POLICY "stations_admin_update" ON public.stations
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "stations_admin_delete" ON public.stations
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 8. Station managers policies
CREATE POLICY "managers_self_read" ON public.station_managers
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "managers_admin_write" ON public.station_managers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. Manager request policies
CREATE POLICY "manager_req_self_read" ON public.station_manager_requests
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "manager_req_self_insert" ON public.station_manager_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "manager_req_admin_update" ON public.station_manager_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 10. Recreate latest status view preferring official reports in last 6h
DROP VIEW IF EXISTS public.station_status_latest;

CREATE VIEW public.station_status_latest AS
WITH ranked AS (
  SELECT
    station_id,
    fuel_type,
    status,
    price_kz,
    queue_minutes,
    source,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY station_id, fuel_type
      ORDER BY (source = 'official') DESC, created_at DESC
    ) AS rn
  FROM public.reports
  WHERE created_at > now() - INTERVAL '6 hours'
)
SELECT
  station_id,
  fuel_type,
  status,
  price_kz,
  queue_minutes,
  source,
  created_at AS reported_at
FROM ranked
WHERE rn = 1;
