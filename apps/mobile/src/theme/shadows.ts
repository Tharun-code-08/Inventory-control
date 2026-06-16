import { Platform, type ViewStyle } from 'react-native';

function shadow(elevation: number, color = '#000'): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: elevation / 2 },
    shadowOpacity: 0.08 + elevation * 0.02,
    shadowRadius: elevation,
  };
}

export const shadows = {
  sm: shadow(2),
  md: shadow(4),
  lg: shadow(8),
  fab: shadow(6),
} as const;
