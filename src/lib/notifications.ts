import * as Notifications from 'expo-notifications';

/**
 * Rest timer alerts. The JS timer freezes when the phone locks or the app goes
 * to the background, so the actual "your set is up" signal is a scheduled local
 * notification — it fires with sound whatever the app is doing.
 */

let configured = false;

export function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      // banner while training, no clutter in the notification centre afterwards
      shouldShowBanner: true,
      shouldShowList: false,
    }),
  });
}

let permissionAsked = false;

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (permissionAsked && !current.canAskAgain) return false;
  permissionAsked = true;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

/** Schedule the "rest is over" alert; returns an id to cancel it with. */
export async function scheduleRestAlert(seconds: number): Promise<string | null> {
  if (seconds < 1) return null;
  if (!(await ensurePermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Отдых окончен',
        body: 'Следующий подход',
        sound: true,
        interruptionLevel: 'timeSensitive',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelAlert(id: string | null) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired or cancelled
  }
}

const REMINDER_KIND = 'training-reminder';

/** ISO weekday (1 = Mon) → iOS weekday (1 = Sun). */
const toIosWeekday = (iso: number) => (iso % 7) + 1;

async function cancelTrainingReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === REMINDER_KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Weekly "go train" nudges. Replaces any previously scheduled reminders and
 * leaves rest-timer alerts alone.
 */
export async function syncTrainingReminders(
  enabled: boolean,
  isoWeekdays: number[],
  hour: number,
): Promise<boolean> {
  await cancelTrainingReminders();
  if (!enabled || !isoWeekdays.length) return true;
  if (!(await ensurePermission())) return false;

  await Promise.all(
    isoWeekdays.map((iso) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Сегодня тренировка',
          body: 'Программа ждёт — открой VOLT и начинай',
          sound: true,
          data: { kind: REMINDER_KIND },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toIosWeekday(iso),
          hour,
          minute: 0,
        },
      }),
    ),
  );
  return true;
}
