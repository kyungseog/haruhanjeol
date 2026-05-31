import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ClovaField {
  inferText: string;
  inferConfidence: number;
}

interface ClovaImage {
  fields?: ClovaField[];
  errorMessage?: string;
}

interface ClovaResponse {
  images: ClovaImage[];
}

Deno.serve(async (req) => {
  try {
    // JWT 검증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { imageBase64, imageFormat } = await req.json() as {
      imageBase64: string;
      imageFormat: string; // 'jpg' | 'png'
    };

    const ocrUrl = Deno.env.get('CLOVA_OCR_URL');
    const ocrSecret = Deno.env.get('CLOVA_OCR_SECRET');

    if (!ocrUrl || !ocrSecret) {
      return new Response(JSON.stringify({ error: 'OCR not configured' }), { status: 500 });
    }

    const requestId = crypto.randomUUID();
    const body = {
      version: 'V2',
      requestId,
      timestamp: Date.now(),
      lang: 'ko',
      images: [
        {
          format: imageFormat,
          name: 'verse',
          data: imageBase64,
        },
      ],
    };

    const res = await fetch(ocrUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OCR-SECRET': ocrSecret,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `Clova OCR error: ${errText}` }), { status: 502 });
    }

    const result: ClovaResponse = await res.json();
    const image = result.images?.[0];

    if (!image || image.errorMessage) {
      return new Response(JSON.stringify({ error: image?.errorMessage ?? 'OCR failed' }), { status: 422 });
    }

    // 인식된 텍스트를 줄 순서대로 연결
    const text = (image.fields ?? [])
      .map(f => f.inferText)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
