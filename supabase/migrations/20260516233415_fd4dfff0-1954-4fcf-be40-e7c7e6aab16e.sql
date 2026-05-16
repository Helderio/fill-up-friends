
-- Enums
CREATE TYPE public.fuel_type AS ENUM ('gasolina', 'gasoleo');
CREATE TYPE public.station_status AS ENUM ('disponivel', 'pouco', 'sem_stock');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Stations
CREATE TABLE public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  address TEXT,
  province TEXT NOT NULL DEFAULT 'Luanda',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stations_province_idx ON public.stations(province);

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id UUID,
  device_id TEXT,
  fuel_type public.fuel_type NOT NULL,
  status public.station_status NOT NULL,
  price_kz INTEGER,
  queue_minutes INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reports_station_fuel_created_idx ON public.reports(station_id, fuel_type, created_at DESC);
CREATE INDEX reports_created_idx ON public.reports(created_at DESC);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proximity alerts
CREATE TABLE public.proximity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  fuel_type public.fuel_type NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, station_id, fuel_type)
);
CREATE INDEX proximity_alerts_user_idx ON public.proximity_alerts(user_id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Security definer for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Latest status view (last 6 hours, per station+fuel)
CREATE OR REPLACE VIEW public.station_status_latest AS
SELECT DISTINCT ON (station_id, fuel_type)
  station_id,
  fuel_type,
  status,
  price_kz,
  queue_minutes,
  created_at AS reported_at
FROM public.reports
WHERE created_at > now() - INTERVAL '6 hours'
ORDER BY station_id, fuel_type, created_at DESC;

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Validation trigger for reports
CREATE OR REPLACE FUNCTION public.validate_report()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.price_kz IS NOT NULL AND (NEW.price_kz < 0 OR NEW.price_kz > 100000) THEN
    RAISE EXCEPTION 'preço inválido';
  END IF;
  IF NEW.queue_minutes IS NOT NULL AND (NEW.queue_minutes < 0 OR NEW.queue_minutes > 600) THEN
    RAISE EXCEPTION 'fila inválida';
  END IF;
  IF NEW.user_id IS NULL AND (NEW.device_id IS NULL OR length(NEW.device_id) < 6) THEN
    RAISE EXCEPTION 'identificação do dispositivo necessária para reportes anónimos';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reports_validate
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_report();

-- Enable RLS
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Stations: public read, admin write
CREATE POLICY "stations_public_read" ON public.stations FOR SELECT USING (true);
CREATE POLICY "stations_admin_write" ON public.stations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Reports: public read, anyone insert (anon or auth), only owner update/delete
CREATE POLICY "reports_public_read" ON public.reports FOR SELECT USING (true);
CREATE POLICY "reports_anyone_insert" ON public.reports FOR INSERT WITH CHECK (
  (user_id IS NULL AND device_id IS NOT NULL) OR (user_id = auth.uid())
);
CREATE POLICY "reports_owner_update" ON public.reports FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "reports_owner_delete" ON public.reports FOR DELETE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Profiles: each user sees/edits own
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Proximity alerts: own only
CREATE POLICY "alerts_self_all" ON public.proximity_alerts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- User roles: read own; admin manages
CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
