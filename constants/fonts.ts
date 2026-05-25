export const Fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

// React Native StyleSheet에서 fontFamily를 fontWeight와 함께 쓰면
// Pretendard가 무시되므로, fontWeight 대신 fontFamily로 굵기를 표현합니다.
export const FontStyles = {
  regular: { fontFamily: 'Pretendard-Regular' },
  medium: { fontFamily: 'Pretendard-Medium' },
  semiBold: { fontFamily: 'Pretendard-SemiBold' },
  bold: { fontFamily: 'Pretendard-Bold' },
} as const;
