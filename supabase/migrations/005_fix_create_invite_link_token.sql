-- gen_random_bytes(pgcrypto) 의존성 제거 → gen_random_uuid() 사용
CREATE OR REPLACE FUNCTION public.create_invite_link(p_group_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO group_invite_links (group_id, token, expires_at, created_by)
  VALUES (p_group_id, v_token, NOW() + INTERVAL '7 days', auth.uid());
  RETURN v_token;
END;
$$;
