import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type Props = {
  name: string;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color = Colors.textPrimary }: Props) {
  return <MaterialIcons name={name as any} size={size} color={color} />;
}
