import React from 'react';
import Svg, { Rect, Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';

type Props = {
  size?: number;
  variant?: 'light' | 'dark';
};

export function AppIcon({ size = 80, variant = 'light' }: Props) {
  const bgColor = variant === 'light' ? '#FFF8EC' : '#2A2A3E';
  const rightHalfFill = variant === 'light' ? '#FFE4A0' : '#3A3A52';
  const rightHalfFillTop = variant === 'light' ? '#FFF8EC' : '#3A3A52';
  const dividerOpacity = variant === 'light' ? '0.55' : '0.2';
  const shineOpacity = variant === 'light' ? '0.45' : '0.3';
  const lineOpacity2 = variant === 'light' ? '0.35' : '0.35';
  const lineOpacity3 = variant === 'light' ? '0.25' : '0.2';

  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Defs>
        <LinearGradient id="capGold" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFD770" />
          <Stop offset="100%" stopColor="#E8941A" />
        </LinearGradient>
        <LinearGradient id="capRight" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={rightHalfFillTop} />
          <Stop offset="100%" stopColor={rightHalfFill} />
        </LinearGradient>
      </Defs>
      <Rect width="80" height="80" rx="22" fill={bgColor} />
      {/* 캡슐 왼쪽 (골드) */}
      <Path
        d="M18 40C18 27.5 26.5 18 38 18L42 18L42 62L38 62C26.5 62 18 52.5 18 40Z"
        fill="url(#capGold)"
      />
      {/* 캡슐 오른쪽 */}
      <Path
        d="M42 18L44 18C55.5 18 64 27.5 64 40C64 52.5 55.5 62 44 62L42 62Z"
        fill="url(#capRight)"
      />
      {/* 중앙 구분선 */}
      <Rect x="40.5" y="18" width="2" height="44" fill="white" fillOpacity={dividerOpacity} />
      {/* 광택 */}
      <Ellipse
        cx="29" cy="27" rx="5" ry="3"
        fill="white" fillOpacity={shineOpacity}
        transform="rotate(-20 29 27)"
      />
      {/* 오른쪽 한절 라인들 */}
      <Rect x="46" y="32" width="13" height="3" rx="1.5" fill="#F5A623" fillOpacity="0.85" />
      <Rect x="46" y="39" width="13" height="3" rx="1.5" fill="#C8860A" fillOpacity={lineOpacity2} />
      <Rect x="46" y="46" width="9" height="3" rx="1.5" fill="#C8860A" fillOpacity={lineOpacity3} />
    </Svg>
  );
}
