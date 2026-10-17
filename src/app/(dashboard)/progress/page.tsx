import {
  computeStreak,
  evaluateAchievements,
  levelFor,
  totalXp,
  weeklyChallenges,
  weeklyMessage,
  xpByMonth,
} from '@/domain/finance/progress';
import { ProgressView } from '@/presentation/components/modules/progress/ProgressView';
import { loadFinance } from '../_lib/loadFinance';

export const metadata = { title: 'Mi progreso' };

export default async function ProgressPage() {
  const { snapshot, weekly, monthly, history, newlyGranted } = await loadFinance();
  const xp = totalXp(snapshot);
  return (
    <ProgressView
      weekly={weekly}
      monthly={monthly}
      history={history}
      level={levelFor(xp)}
      streak={computeStreak(snapshot)}
      challenges={weeklyChallenges(snapshot)}
      achievements={evaluateAchievements(snapshot)}
      xpByMonth={xpByMonth(snapshot)}
      milestones={snapshot.xpEvents
        .filter((e) => e.sourceType === 'achievement')
        .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))}
      message={weeklyMessage(snapshot)}
      newlyGranted={newlyGranted}
    />
  );
}
