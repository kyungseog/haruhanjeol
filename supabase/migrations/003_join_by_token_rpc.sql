-- 딥링크 토큰으로 모임 참여 RPC
CREATE OR REPLACE FUNCTION public.join_by_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  SELECT group_id INTO v_group_id
  FROM group_invite_links
  WHERE token = p_token AND expires_at > NOW();

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION '유효하지 않거나 만료된 초대 링크입니다.';
  END IF;

  -- 이미 멤버면 그냥 group_id 반환
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_group_id AND user_id = auth.uid()
  ) THEN
    RETURN v_group_id;
  END IF;

  INSERT INTO group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid());

  RETURN v_group_id;
END;
$$;
