import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Heart, Check, X, Flag, Trash2, Clock, Image as ImageIcon, Send, MapPin, MoveVertical as MoreVertical, Star } from 'lucide-react-native';
import { StarRatingDisplay, StarRatingInteractive } from '@/components/StarRating';
import { useI18n } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { COLORS, SPACING, RADII, SHADOWS, CATEGORIES_COLORS, FONT_SIZES } from '@/lib/theme';
import { isLive, timeUntil, formatTimeLabel, formatDateLabel } from '@/lib/time';
import type { NearbyEvent, CommentWithUser, ReactionStatus, Profile } from '@/types/database';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { session, profile } = useAuth();
  const [event, setEvent] = useState<NearbyEvent | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [myReactions, setMyReactions] = useState<ReactionStatus[]>([]);
  const [myRating, setMyRating] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [reportModal, setReportModal] = useState<null | { eventId?: string; commentId?: string }>(null);
  const [reportReason, setReportReason] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCommentId, setMenuCommentId] = useState<string | null>(null);
  const scrollRef = useRef<FlatList>(null);

  const isCreator = event?.creator_id === session?.user.id;
  const live = event ? isLive(event.start_time) : false;
  const remaining = event ? timeUntil(event.end_time) : null;

  const loadEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: eventData } = await supabase
      .from('events')
      .select('id, creator_id, title, description, category, address_text, start_time, end_time, hidden, created_at')
      .eq('id', id)
      .maybeSingle();

    if (!eventData) {
      setLoading(false);
      return;
    }

    const { data: creatorData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, instagram_username, language, created_at')
      .eq('id', eventData.creator_id)
      .maybeSingle();

    const { count: going } = await supabase
      .from('event_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'going');

    const { count: notGoing } = await supabase
      .from('event_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'not_going');

    const { count: liked } = await supabase
      .from('event_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'liked');

    const { data: locData } = await supabase.rpc('vibe_nearby_events', {
      p_lat: 0,
      p_lng: 0,
      p_radius_m: 99999999,
    });

    const nearby = (locData as NearbyEvent[])?.find((e) => e.id === id);

    const { data: ratingsData } = await supabase
      .from('event_ratings')
      .select('stars')
      .eq('event_id', id);

    const allRatings = ratingsData ?? [];
    const avg = allRatings.length > 0 ? allRatings.reduce((sum: number, r: any) => sum + r.stars, 0) / allRatings.length : 0;
    setAvgRating(avg);
    setRatingCount(allRatings.length);

    setEvent({
      id: eventData.id,
      creator_id: eventData.creator_id,
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      address_text: eventData.address_text,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      lat: nearby?.lat ?? 0,
      lng: nearby?.lng ?? 0,
      creator_username: creatorData?.username ?? t('common.anonymous'),
      creator_avatar_url: creatorData?.avatar_url ?? null,
      creator_account_type: (creatorData as any)?.account_type ?? 'personal',
      going_count: going ?? 0,
      not_going_count: notGoing ?? 0,
      liked_count: liked ?? 0,
      distance_m: nearby?.distance_m ?? 0,
      avg_rating: nearby?.avg_rating ?? avg,
      rating_count: nearby?.rating_count ?? allRatings.length,
    });
    setCreator(creatorData as Profile | null);
    setLoading(false);
  }, [id, t]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('comments')
      .select(`
        id, event_id, user_id, text_content, image_url, hidden, created_at,
        profiles!comments_user_id_fkey (username, avatar_url)
      `)
      .eq('event_id', id)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      const mapped: CommentWithUser[] = data.map((c: any) => ({
        id: c.id,
        event_id: c.event_id,
        user_id: c.user_id,
        text_content: c.text_content,
        image_url: c.image_url,
        hidden: c.hidden,
        created_at: c.created_at,
        username: c.profiles?.username ?? t('common.anonymous'),
        avatar_url: c.profiles?.avatar_url ?? null,
      }));
      setComments(mapped);
    }
  }, [id, t]);

  const loadMyReactions = useCallback(async () => {
    if (!id || !session) return;
    const { data } = await supabase
      .from('event_reactions')
      .select('status')
      .eq('event_id', id)
      .eq('user_id', session.user.id);
    setMyReactions((data?.map((r: { status: string }) => r.status as ReactionStatus)) ?? []);
  }, [id, session]);

  const loadMyRating = useCallback(async () => {
    if (!id || !session) return;
    const { data } = await supabase
      .from('event_ratings')
      .select('stars')
      .eq('event_id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();
    setMyRating(data?.stars ?? 0);
  }, [id, session]);

  useEffect(() => {
    loadEvent();
    loadComments();
    loadMyReactions();
    loadMyRating();
  }, [loadEvent, loadComments, loadMyReactions, loadMyRating]);

  // Realtime subscriptions
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`event-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `event_id=eq.${id}` }, () => {
        loadComments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_reactions', filter: `event_id=eq.${id}` }, () => {
        loadEvent();
        loadMyReactions();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${id}` }, () => {
        loadEvent();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadComments, loadEvent, loadMyReactions]);

  async function submitRating(stars: number) {
    if (!id || !session) return;
    setMyRating(stars);
    const { data: existing } = await supabase
      .from('event_ratings')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (existing) {
      await supabase.from('event_ratings').update({ stars }).eq('id', existing.id);
    } else {
      await supabase.from('event_ratings').insert({ event_id: id, user_id: session.user.id, stars });
    }
    loadEvent();
  }

  async function toggleReaction(status: ReactionStatus) {
    if (!id || !session) return;
    const has = myReactions.includes(status);
    if (has) {
      await supabase.from('event_reactions').delete().eq('event_id', id).eq('user_id', session.user.id).eq('status', status);
    } else {
      await supabase.from('event_reactions').insert({ event_id: id, user_id: session.user.id, status });
    }
    loadMyReactions();
    loadEvent();
  }

  async function sendComment() {
    if (!id || !session || !commentText.trim()) return;
    setSendingComment(true);
    const { error } = await supabase.from('comments').insert({
      event_id: id,
      user_id: session.user.id,
      text_content: commentText.trim(),
    });
    setSendingComment(false);
    if (!error) {
      setCommentText('');
      Keyboard.dismiss();
      loadComments();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    }
  }

  async function sendPhotoComment() {
    if (!id || !session) return;
    setUploadingPhoto(true);
    try {
      const { pickAndCompressPhoto, checkPhotoNSFW, uploadCommentPhoto } = await import('@/lib/photo');
      const photo = await pickAndCompressPhoto();
      if (!photo) {
        setUploadingPhoto(false);
        return;
      }
      const nsfw = await checkPhotoNSFW(photo.base64);
      if (nsfw) {
        Alert.alert(t('app.name'), t('event.nsfwBlocked'));
        setUploadingPhoto(false);
        return;
      }
      const url = await uploadCommentPhoto(session.user.id, photo.base64);
      const { error } = await supabase.from('comments').insert({
        event_id: id,
        user_id: session.user.id,
        image_url: url,
      });
      if (!error) {
        loadComments();
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('event.photoError'));
    }
    setUploadingPhoto(false);
  }

  async function deleteComment(commentId: string) {
    const comment = comments.find((c) => c.id === commentId);
    let imageUrl: string | null = null;
    if (comment?.image_url) {
      try {
        const url = new URL(comment.image_url);
        const path = url.pathname.split('/event-photos/')[1];
        if (path) imageUrl = path;
      } catch {
        // ignore
      }
    }
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      if (imageUrl) {
        await supabase.storage.from('event-photos').remove([imageUrl]);
      }
      loadComments();
    }
  }

  async function extendEvent() {
    if (!event) return;
    Alert.alert(t('app.name'), t('event.confirmExtend'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          const newEnd = new Date(new Date(event.end_time).getTime() + 3600000).toISOString();
          await supabase.from('events').update({ end_time: newEnd }).eq('id', event.id);
          loadEvent();
        },
      },
    ]);
  }

  function goToTabs() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  async function endEventNow() {
    if (!event) return;
    Alert.alert(t('app.name'), t('event.confirmEnd'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('events').update({ end_time: new Date().toISOString() }).eq('id', event.id);
          setMenuOpen(false);
          loadEvent();
        },
      },
    ]);
  }

  async function deleteEvent() {
    if (!event) return;
    Alert.alert(t('app.name'), t('event.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('events').delete().eq('id', event.id);
          goToTabs();
        },
      },
    ]);
  }

  async function submitReport() {
    if (!reportModal || !session) return;
    const payload: any = {
      reporter_id: session.user.id,
      reason: reportReason.trim() || null,
    };
    if (reportModal.eventId) payload.event_id = reportModal.eventId;
    if (reportModal.commentId) payload.comment_id = reportModal.commentId;
    await supabase.from('reports').insert(payload);
    setReportModal(null);
    setReportReason('');
    Alert.alert(t('app.name'), t('event.reportSent'));
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary[600]} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText variant="h3" color={COLORS.neutral[400]}>
          {t('event.ended')}
        </ThemedText>
        <Pressable style={styles.backFromGone} onPress={goToTabs}>
          <ThemedText color={COLORS.primary[600]} weight="semibold">
            {t('common.close')}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  const remainingLabel = remaining
    ? `${remaining.value}${remaining.unit === 'min' ? t('common.minutes') : remaining.unit === 'h' ? t('common.hours') : t('common.days')}`
    : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={goToTabs}>
          <ArrowLeft color={COLORS.neutral[800]} size={24} />
        </Pressable>
        <View style={styles.headerCenter}>
          {live ? (
            <View style={styles.liveBadgeHeader}>
              <View style={styles.liveDot} />
              <ThemedText color={COLORS.live[600]} weight="bold" size={11}>
                {t('map.now').toUpperCase()}
              </ThemedText>
            </View>
          ) : (
            <ThemedText variant="caption" color={COLORS.neutral[500]}>
              {formatDateLabel(event.start_time)} {formatTimeLabel(event.start_time)}
            </ThemedText>
          )}
        </View>
        {isCreator ? (
          <Pressable style={styles.iconBtn} onPress={() => setMenuOpen((v) => !v)}>
            <MoreVertical color={COLORS.neutral[800]} size={24} />
          </Pressable>
        ) : (
          <Pressable style={styles.iconBtn} onPress={() => setReportModal({ eventId: event.id })}>
            <Flag color={COLORS.neutral[600]} size={20} />
          </Pressable>
        )}
      </View>

      {isCreator && menuOpen && (
        <View style={styles.creatorMenu}>
          {live && (
            <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); extendEvent(); }}>
              <Clock color={COLORS.success[600]} size={18} />
              <ThemedText color={COLORS.neutral[800]} weight="medium">{t('event.extend')}</ThemedText>
            </Pressable>
          )}
          <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); endEventNow(); }}>
            <X color={COLORS.warning[600]} size={18} />
            <ThemedText color={COLORS.neutral[800]} weight="medium">{t('event.endNow')}</ThemedText>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => { setMenuOpen(false); deleteEvent(); }}>
            <Trash2 color={COLORS.live[600]} size={18} />
            <ThemedText color={COLORS.live[600]} weight="medium">{t('event.deleteEvent')}</ThemedText>
          </Pressable>
        </View>
      )}

      <FlatList
        ref={scrollRef}
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CommentItem
            comment={item}
            isCreator={isCreator}
            myId={session?.user.id}
            t={t}
            onDelete={deleteComment}
            onReport={(cid) => setReportModal({ commentId: cid })}
            onMenuOpen={setMenuCommentId}
            menuOpenId={menuCommentId}
            setMenuOpenId={setMenuCommentId}
          />
        )}
        ListHeaderComponent={
          <View style={styles.eventInfo}>
            <View style={[styles.catBar, { backgroundColor: CATEGORIES_COLORS[event.category] ?? COLORS.primary[600] }]} />
            <ThemedText variant="h1" color={COLORS.neutral[900]} style={styles.eventTitle}>
              {event.title}
            </ThemedText>
            {event.description && (
              <ThemedText variant="body" color={COLORS.neutral[600]} style={{ marginTop: SPACING.sm }}>
                {event.description}
              </ThemedText>
            )}

            <View style={styles.metaRow}>
              <View style={styles.creatorChip}>
                <Avatar url={creator?.avatar_url} username={creator?.username ?? '?'} size={28} />
                <ThemedText variant="label" color={COLORS.neutral[700]} weight="medium">
                  {t('event.by', { name: event.creator_username })}
                </ThemedText>
                {creator?.instagram_username && (
                  <Pressable onPress={() => Linking.openURL(`https://instagram.com/${creator.instagram_username}`)}>
                    <InstagramSmall />
                  </Pressable>
                )}
              </View>
            </View>

            {event.address_text && (
              <View style={styles.addrRow}>
                <MapPin color={COLORS.neutral[400]} size={16} />
                <ThemedText variant="muted" color={COLORS.neutral[600]}>{event.address_text}</ThemedText>
              </View>
            )}

            {/* Overall rating display */}
            {ratingCount > 0 && (
              <View style={styles.ratingSummaryRow}>
                <StarRatingDisplay rating={avgRating} count={ratingCount} size={18} />
              </View>
            )}

            {/* Interactive star rating */}
            {session && (
              <View style={styles.interactiveRatingBox}>
                <ThemedText variant="label" color={COLORS.neutral[700]} weight="semibold">
                  {t('event.rateEvent')}
                </ThemedText>
                <StarRatingInteractive
                  rating={myRating}
                  size={36}
                  onRate={submitRating}
                />
                <ThemedText variant="caption" color={COLORS.neutral[500]}>
                  {myRating > 0 ? `${t('event.yourRating')}: ${myRating}` : t('event.rateHint')}
                </ThemedText>
              </View>
            )}

            {live && remainingLabel ? (
              <View style={styles.endsInRow}>
                <Clock color={COLORS.live[500]} size={16} />
                <ThemedText variant="label" color={COLORS.live[600]} weight="semibold">
                  {t('event.endsIn', { time: remainingLabel })}
                </ThemedText>
              </View>
            ) : null}

            {/* Reactions */}
            <View style={styles.reactionsRow}>
              <ReactionButton
                icon={<Check size={18} />}
                label={t('event.going')}
                count={event.going_count}
                active={myReactions.includes('going')}
                activeColor={COLORS.success[600]}
                onPress={() => toggleReaction('going')}
                t={t}
              />
              <ReactionButton
                icon={<X size={18} />}
                label={t('event.notGoing')}
                count={event.not_going_count}
                active={myReactions.includes('not_going')}
                activeColor={COLORS.neutral[600]}
                onPress={() => toggleReaction('not_going')}
                t={t}
              />
              <ReactionButton
                icon={<Heart size={18} />}
                label={t('event.like')}
                count={event.liked_count}
                active={myReactions.includes('liked')}
                activeColor={COLORS.live[600]}
                onPress={() => toggleReaction('liked')}
                t={t}
              />
            </View>

            <View style={styles.commentsDivider}>
              <ThemedText variant="label" color={COLORS.neutral[500]} weight="semibold">
                {t('event.comments')}
              </ThemedText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.noComments}>
            <ThemedText variant="muted" color={COLORS.neutral[400]} align="center">
              {t('event.noComments')}
            </ThemedText>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {}}
      />

      {/* Comment input */}
      <View style={styles.inputBar}>
        <Pressable style={styles.photoBtn} onPress={sendPhotoComment} disabled={uploadingPhoto}>
          {uploadingPhoto ? (
            <ActivityIndicator color={COLORS.primary[600]} size="small" />
          ) : (
            <ImageIcon color={COLORS.primary[600]} size={24} />
          )}
        </Pressable>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder={t('event.writeComment')}
          placeholderTextColor={COLORS.neutral[400]}
          style={styles.commentInput}
          multiline
          maxLength={500}
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }, (!commentText.trim() || sendingComment) && styles.sendDisabled]}
          onPress={sendComment}
          disabled={!commentText.trim() || sendingComment}
        >
          {sendingComment ? (
            <ActivityIndicator color={COLORS.neutral[0]} size="small" />
          ) : (
            <Send color={COLORS.neutral[0]} size={20} />
          )}
        </Pressable>
      </View>

      {/* Report modal */}
      {reportModal && (
        <View style={styles.modalOverlay}>
          <Pressable style={styles.overlayPress} onPress={() => { setReportModal(null); setReportReason(''); }} />
          <View style={styles.reportModal}>
            <ThemedText variant="h3" color={COLORS.neutral[900]}>
              {reportModal.eventId ? t('event.reportEvent') : t('event.reportComment')}
            </ThemedText>
            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder={t('event.reportReasonPlaceholder')}
              placeholderTextColor={COLORS.neutral[400]}
              style={styles.reportInput}
              multiline
              maxLength={300}
            />
            <View style={styles.reportActions}>
              <Pressable
                style={styles.reportCancelBtn}
                onPress={() => { setReportModal(null); setReportReason(''); }}
              >
                <ThemedText color={COLORS.neutral[600]} weight="medium">{t('common.cancel')}</ThemedText>
              </Pressable>
              <Pressable style={styles.reportSubmitBtn} onPress={submitReport}>
                <ThemedText color={COLORS.neutral[0]} weight="bold">{t('event.reportSubmit')}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function InstagramSmall() {
  return (
    <View style={styles.igSmallBadge}>
      <ThemedText color={COLORS.neutral[0]} size={10} weight="bold">IG</ThemedText>
    </View>
  );
}

function CommentItem({
  comment,
  isCreator,
  myId,
  t,
  onDelete,
  onReport,
  onMenuOpen,
  menuOpenId,
  setMenuOpenId,
}: {
  comment: CommentWithUser;
  isCreator: boolean;
  myId: string | undefined;
  t: (k: string, p?: Record<string, string | number>) => string;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  onMenuOpen: (id: string | null) => void;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
}) {
  const canDelete = comment.user_id === myId || isCreator;
  const showMenu = menuOpenId === comment.id;

  return (
    <View style={styles.commentRow}>
      <Avatar url={comment.avatar_url} username={comment.username} size={32} />
      <View style={styles.commentBubble}>
        <View style={styles.commentHeader}>
          <ThemedText variant="label" color={COLORS.neutral[800]} weight="semibold">
            {comment.username}
            {comment.user_id === myId ? ` · ${t('common.you')}` : ''}
          </ThemedText>
          {canDelete && (
            <Pressable style={styles.commentMenuBtn} onPress={() => onMenuOpen(showMenu ? null : comment.id)}>
              <MoreVertical color={COLORS.neutral[400]} size={16} />
            </Pressable>
          )}
        </View>
        {comment.text_content && (
          <ThemedText variant="body" color={COLORS.neutral[700]}>
            {comment.text_content}
          </ThemedText>
        )}
        {comment.image_url && (
          <Image source={{ uri: comment.image_url }} style={styles.commentImage} resizeMode="cover" />
        )}
        {showMenu && canDelete && (
          <View style={styles.commentMenu}>
            <Pressable
              style={styles.commentMenuItem}
              onPress={() => { setMenuOpenId(null); onDelete(comment.id); }}
            >
              <Trash2 color={COLORS.live[600]} size={15} />
              <ThemedText color={COLORS.live[600]} weight="medium" size={13}>{t('event.deleteComment')}</ThemedText>
            </Pressable>
            {comment.user_id !== myId && (
              <Pressable
                style={styles.commentMenuItem}
                onPress={() => { setMenuOpenId(null); onReport(comment.id); }}
              >
                <Flag color={COLORS.neutral[600]} size={15} />
                <ThemedText color={COLORS.neutral[600]} weight="medium" size={13}>{t('event.report')}</ThemedText>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function ReactionButton({
  icon,
  label,
  count,
  active,
  activeColor,
  onPress,
  t: _t,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  activeColor: string;
  onPress: () => void;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.reactionBtn,
        active && { backgroundColor: activeColor, borderColor: activeColor },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      {icon}
      <ThemedText
        color={active ? COLORS.neutral[0] : COLORS.neutral[600]}
        weight={active ? 'bold' : 'medium'}
        size={13}
      >
        {label}
      </ThemedText>
      {count > 0 && (
        <ThemedText
          color={active ? COLORS.neutral[100] : COLORS.neutral[400]}
          weight="semibold"
          size={12}
        >
          {count}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral[0] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, backgroundColor: COLORS.neutral[0] },
  backFromGone: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: RADII.pill, backgroundColor: COLORS.primary[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 56,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  liveBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.live[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.live[500] },
  creatorMenu: {
    position: 'absolute',
    top: 100,
    right: SPACING.md,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.md,
    padding: SPACING.xs,
    ...SHADOWS.lg,
    zIndex: 50,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
  },
  listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  eventInfo: { paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  catBar: { height: 4, borderRadius: 2, marginBottom: SPACING.sm },
  eventTitle: { marginBottom: SPACING.xs },
  metaRow: { marginTop: SPACING.md },
  creatorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
    alignSelf: 'flex-start',
  },
  igSmallBadge: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#E1306C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.md },
  endsInRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm },
  reactionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  ratingSummaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  interactiveRatingBox: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.lg,
    gap: SPACING.xs,
  },
  reactionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: COLORS.neutral[200],
    backgroundColor: COLORS.neutral[50],
  },
  commentsDivider: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  noComments: { paddingVertical: SPACING.xxl, alignItems: 'center' },
  commentRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  commentBubble: {
    flex: 1,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  commentMenuBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  commentMenu: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.md,
    padding: SPACING.xs,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  commentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  commentImage: {
    width: '100%',
    height: 200,
    borderRadius: RADII.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.neutral[100],
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: COLORS.neutral[0],
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[100],
  },
  photoBtn: {
    width: 44,
    height: 44,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.neutral[900],
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  modalOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayPress: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  reportModal: {
    width: '85%',
    backgroundColor: COLORS.neutral[0],
    borderRadius: RADII.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  reportInput: {
    backgroundColor: COLORS.neutral[50],
    borderRadius: RADII.md,
    padding: SPACING.md,
    minHeight: 80,
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.neutral[900],
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
    textAlignVertical: 'top',
  },
  reportActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, justifyContent: 'flex-end' },
  reportCancelBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.md,
  },
  reportSubmitBtn: {
    backgroundColor: COLORS.live[600],
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
  },
});
