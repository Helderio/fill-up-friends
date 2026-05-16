
ALTER VIEW public.station_status_latest SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.validate_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
