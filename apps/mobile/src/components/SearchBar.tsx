import { useState, useCallback } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';
import { useDebounce } from '@/hooks/use-debounce';
import { SEARCH } from '@/lib/constants';

export function SearchBar({
  placeholder = 'Search…',
  onSearch,
  debounceMs = SEARCH.DEBOUNCE_MS,
}: {
  placeholder?: string;
  onSearch: (term: string) => void;
  debounceMs?: number;
}) {
  const [text, setText] = useState('');
  const debouncedText = useDebounce(text, debounceMs);

  const prevRef = { current: '' };
  if (debouncedText !== prevRef.current) {
    prevRef.current = debouncedText;
    onSearch(debouncedText);
  }

  const clear = useCallback(() => {
    setText('');
    onSearch('');
  }, [onSearch]);

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={18} color={colors.muted} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {text.length > 0 ? (
        <Pressable onPress={clear} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: typography.size.md,
    color: colors.text,
  },
});
