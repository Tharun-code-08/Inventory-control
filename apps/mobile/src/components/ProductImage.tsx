import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uploadAssetUrl } from '@/lib/asset-url';
import { colors } from '@/theme';

type Props = {
  /** Server-relative or absolute image URL; falls back to a category icon. */
  uri?: string | null;
  category?: string | null;
  size?: number;
  /** Rounded corners radius. */
  radius?: number;
};

/** Category keyword → fallback icon + tint, used when a product has no photo. */
const CATEGORY_ICONS: Array<{
  match: RegExp;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  { match: /electr|electronic/i, icon: 'flash-outline', color: '#f59e0b' },
  { match: /hardware|tool|mechanical/i, icon: 'hammer-outline', color: '#64748b' },
  { match: /food|grocery|beverage|drink/i, icon: 'fast-food-outline', color: '#22c55e' },
  { match: /cloth|apparel|garment|textile/i, icon: 'shirt-outline', color: '#8b5cf6' },
  { match: /medic|pharma|health/i, icon: 'medkit-outline', color: '#ef4444' },
  { match: /stationery|office|paper/i, icon: 'document-text-outline', color: '#0ea5e9' },
  { match: /chemical|paint/i, icon: 'flask-outline', color: '#14b8a6' },
];

function categoryFallback(category?: string | null) {
  if (category) {
    const hit = CATEGORY_ICONS.find((c) => c.match.test(category));
    if (hit) return hit;
  }
  return { icon: 'cube-outline' as const, color: colors.muted };
}

export function ProductImage({ uri, category, size = 44, radius = 8 }: Props) {
  const resolved = uploadAssetUrl(uri);
  const box = { width: size, height: size, borderRadius: radius };

  if (resolved) {
    return <Image source={{ uri: resolved }} style={[styles.image, box]} resizeMode="cover" />;
  }
  const fallback = categoryFallback(category);
  return (
    <View style={[styles.placeholder, box]}>
      <Ionicons name={fallback.icon} size={Math.round(size * 0.55)} color={fallback.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.borderLight },
  placeholder: {
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
