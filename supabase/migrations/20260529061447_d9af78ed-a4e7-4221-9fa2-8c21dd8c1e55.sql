
CREATE TABLE public.server_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  error_message text NOT NULL,
  error_code text,
  user_id uuid,
  device_id_hash text,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX server_error_logs_created_at_idx ON public.server_error_logs (created_at DESC);
CREATE INDEX server_error_logs_function_name_idx ON public.server_error_logs (function_name, created_at DESC);

GRANT SELECT ON public.server_error_logs TO authenticated;
GRANT ALL ON public.server_error_logs TO service_role;

ALTER TABLE public.server_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "error_logs_admin_read"
ON public.server_error_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
