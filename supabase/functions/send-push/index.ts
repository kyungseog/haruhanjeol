import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const { toUserIds, title, body, data } = await req.json() as {
      toUserIds: string[];
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };

    if (!toUserIds?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 대상 유저들의 푸시 토큰 조회
    const { data: rows, error } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', toUserIds);

    if (error) throw error;

    const tokens = (rows ?? []).map(r => r.token).filter(Boolean);
    if (!tokens.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Expo Push API 호출
    const messages = tokens.map(token => ({ to: token, title, body, data: data ?? {} }));
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ sent: tokens.length, result }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
