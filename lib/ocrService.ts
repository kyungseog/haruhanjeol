import { supabase } from './supabase';

export type OcrVerdict = 'pass' | 'confirm' | 'reject';

export type OcrResult = {
  text: string;
  score: number;    // 0~1
  verdict: OcrVerdict;
};

// 한국어 텍스트 정규화: 공백·구두점·절 번호 제거
function normalizeText(text: string): string {
  return text
    .replace(/^\s*\d+\s*[절장]?\s*/u, '')  // 앞 절/장 번호 제거
    .replace(/[.,!?;:'"()\-–—·…]/gu, '')   // 구두점 제거
    .replace(/\s+/gu, '')                   // 공백 제거
    .toLowerCase();
}

// LCS 기반 Dice 유사도 (0~1)
function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const m = na.length;
  const n = nb.length;

  // 메모리 절약을 위해 1D 롤링 배열 사용
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = na[i - 1] === nb[j - 1]
        ? prev[j - 1] + 1
        : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  const lcs = prev[n];
  return (2 * lcs) / (m + n);
}

function getVerdict(score: number): OcrVerdict {
  if (score >= 0.88) return 'pass';
  if (score >= 0.75) return 'confirm';
  return 'reject';
}

// 이미지 URI → Base64 변환
async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Edge Function 호출 → 인식 텍스트 반환
async function callOcrFunction(imageBase64: string, imageFormat: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ocr-recognize`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ imageBase64, imageFormat }),
    },
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'OCR failed');
  return json.text as string;
}

// 메인: URI → OCR 결과 반환
export async function recognizeVerse(
  localUri: string,
  verseText: string,
): Promise<OcrResult> {
  const base64 = await uriToBase64(localUri);
  const text = await callOcrFunction(base64, 'jpg');
  const score = similarity(text, verseText);
  const verdict = getVerdict(score);
  return { text, score, verdict };
}
