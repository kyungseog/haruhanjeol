-- groups: 모임 유형 + 목표 컬럼 추가
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS group_type        VARCHAR(15)  NOT NULL DEFAULT 'independent'
    CHECK (group_type IN ('independent', 'shared')),
  ADD COLUMN IF NOT EXISTS group_daily_goal  INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS group_target_date DATE         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS split_mode        VARCHAR(10)  DEFAULT NULL
    CHECK (split_mode IN ('equal', 'custom')),
  ADD COLUMN IF NOT EXISTS goal_set_at       TIMESTAMPTZ  DEFAULT NULL;

-- group_members: 개인 할당량 추가
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS assigned_verses INT DEFAULT NULL;

-- RLS: 방장만 groups 수정 가능
CREATE POLICY "방장만 모임 수정"
  ON public.groups FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS: 방장만 멤버 할당량 수정 가능
CREATE POLICY "방장만 멤버 할당량 수정"
  ON public.group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_members.group_id AND created_by = auth.uid()
    )
  );

-- create_group RPC: group_type 파라미터 추가 (기존 함수 교체)
CREATE OR REPLACE FUNCTION public.create_group(
  p_name        TEXT,
  p_description TEXT        DEFAULT NULL,
  p_group_type  VARCHAR(15) DEFAULT 'independent'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
  v_code     VARCHAR(6);
BEGIN
  LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.groups WHERE invite_code = v_code);
  END LOOP;

  INSERT INTO public.groups (name, description, invite_code, created_by, group_type)
  VALUES (p_name, p_description, v_code, auth.uid(), p_group_type)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid());

  RETURN v_group_id;
END;
$$;
