import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { type FriendProfile, useFriendsStore } from '@/store/friendsStore';
import { palette } from '@/theme/colors';
import { minTouchTarget, radius, spacing } from '@/theme/spacing';
import { fontFamily, fontSize } from '@/theme/typography';

export default function FriendsScreen() {
  const { t } = useTranslation();
  const friends = useFriendsStore((s) => s.friends);
  const incoming = useFriendsStore((s) => s.incoming);
  const outgoing = useFriendsStore((s) => s.outgoing);
  const searchResults = useFriendsStore((s) => s.searchResults);
  const loading = useFriendsStore((s) => s.loading);
  const refresh = useFriendsStore((s) => s.refresh);
  const searchUsers = useFriendsStore((s) => s.searchUsers);
  const clearSearch = useFriendsStore((s) => s.clearSearch);
  const sendRequest = useFriendsStore((s) => s.sendRequest);
  const acceptRequest = useFriendsStore((s) => s.acceptRequest);
  const removeRequest = useFriendsStore((s) => s.removeRequest);

  const [query, setQuery] = useState('');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) void searchUsers(query);
      else clearSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchUsers, clearSearch]);

  const pendingOrFriendIds = new Set([
    ...friends.map((f) => f.profile.id),
    ...incoming.map((r) => r.from.id),
    ...outgoing.map((r) => r.to.id),
  ]);

  const handleSend = async (user: FriendProfile) => {
    setSendError(null);
    const failure = await sendRequest(user.id);
    if (failure) setSendError(failure);
    else setSentTo((prev) => new Set(prev).add(user.id));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('friends.title')}</Text>
          <View style={{ width: minTouchTarget }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('friends.searchPlaceholder')}
            placeholderTextColor={palette.ivoryFaint}
            style={styles.searchInput}
            accessibilityLabel={t('friends.searchPlaceholder')}
          />

          {searchResults.length > 0 && (
            <View style={styles.list}>
              {searchResults.map((user) => {
                const alreadyKnown = pendingOrFriendIds.has(user.id) || sentTo.has(user.id);
                return (
                  <Card key={user.id} style={styles.row}>
                    <Text style={styles.username}>{user.username}</Text>
                    <Button
                      label={alreadyKnown ? t('friends.pending') : t('friends.add')}
                      variant="secondary"
                      disabled={alreadyKnown}
                      onPress={() => void handleSend(user)}
                    />
                  </Card>
                );
              })}
            </View>
          )}
          {sendError && <Text style={styles.errorText}>{sendError}</Text>}

          {loading && friends.length === 0 && incoming.length === 0 && outgoing.length === 0 ? (
            <ActivityIndicator color={palette.violetBright} style={{ marginTop: spacing.lg }} />
          ) : (
            <>
              <SectionTitle label={t('friends.incomingTitle')} />
              {incoming.length === 0 ? (
                <Text style={styles.emptyText}>{t('friends.noIncoming')}</Text>
              ) : (
                <View style={styles.list}>
                  {incoming.map((req) => (
                    <Card key={req.requestId} style={styles.row}>
                      <Text style={styles.username}>{req.from.username}</Text>
                      <View style={styles.rowActions}>
                        <Button label={t('friends.accept')} onPress={() => void acceptRequest(req.requestId)} style={styles.smallButton} />
                        <Button label={t('friends.decline')} variant="ghost" onPress={() => void removeRequest(req.requestId)} style={styles.smallButton} />
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              <SectionTitle label={t('friends.outgoingTitle')} />
              {outgoing.length === 0 ? (
                <Text style={styles.emptyText}>{t('friends.noOutgoing')}</Text>
              ) : (
                <View style={styles.list}>
                  {outgoing.map((req) => (
                    <Card key={req.requestId} style={styles.row}>
                      <Text style={styles.username}>{req.to.username}</Text>
                      <Button label={t('friends.cancel')} variant="ghost" onPress={() => void removeRequest(req.requestId)} style={styles.smallButton} />
                    </Card>
                  ))}
                </View>
              )}

              <SectionTitle label={t('friends.friendsTitle')} />
              {friends.length === 0 ? (
                <Text style={styles.emptyText}>{t('friends.noFriends')}</Text>
              ) : (
                <View style={styles.list}>
                  {friends.map((friend) => (
                    <Card key={friend.requestId} style={styles.row}>
                      <Text style={styles.username}>{friend.profile.username}</Text>
                      <Button label={t('friends.remove')} variant="ghost" onPress={() => void removeRequest(friend.requestId)} style={styles.smallButton} />
                    </Card>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.voidBlack,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: palette.ivory,
  },
  headerTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.xl,
    color: palette.ivory,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  searchInput: {
    backgroundColor: palette.stonePanelRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.stoneBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: palette.ivory,
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    color: palette.violetBright,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  smallButton: {
    paddingHorizontal: spacing.sm,
  },
  username: {
    color: palette.ivory,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  emptyText: {
    color: palette.ivoryFaint,
    fontSize: fontSize.sm,
  },
  errorText: {
    color: palette.danger,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});
