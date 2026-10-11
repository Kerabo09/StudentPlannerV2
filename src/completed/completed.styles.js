import { StyleSheet } from 'react-native';
import { colors } from '@/tasks/tasks.styles';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    flex: 1,
  },
  listFooter: {
    height: 32,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  },
  deleteAllBtn: {
    paddingVertical: 6,
    paddingLeft: 12,
  },
  deleteAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  insights: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  insightsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  insightsMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    height: 96,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  bar: {
    width: '100%',
    maxWidth: 28,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
  },
  barActive: {
    backgroundColor: colors.primary,
  },
  barValue: {
    fontSize: 10,
    color: colors.muted,
  },
  barLabel: {
    fontSize: 10,
    color: colors.faint,
    fontWeight: '600',
  },
  subjectList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    gap: 10,
  },
  subjectInfo: {
    flex: 1,
    gap: 2,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  subjectAvg: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  cardScore: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  count: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    fontSize: 12,
    color: colors.muted,
  },

  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardDone: {
    opacity: 0.55,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardContent: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.faint,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  deleteBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },

  empty: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lavenderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
