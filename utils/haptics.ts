import { useAppStore } from '@/store/useAppStore';

const triggerVibrate = (pattern: number | number[]) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      const enabled = useAppStore.getState().preferences.settings.hapticFeedback;
      if (!enabled) return;
      navigator.vibrate(pattern);
    } catch (e) {}
  }
};

export const haptics = {
  /**
   * Light crisp selection tap (10ms)
   * Use for tab bar clicks, rating stars, radio buttons, toggles
   */
  selection: () => {
    triggerVibrate(12);
  },

  /**
   * Medium impact (20ms)
   * Use for selecting destinations, card selections, input buttons
   */
  impact: () => {
    triggerVibrate(25);
  },

  /**
   * Heavy rhythmic pulse (35ms, 40ms pause, 20ms)
   * Use for primary MOTOTAXI button, confirm trip, start ride
   */
  heavy: () => {
    triggerVibrate([35, 40, 20]);
  },

  /**
   * Rhythmic Success Melody (20ms, 40ms pause, 30ms, 40ms pause, 50ms)
   * Use for Mototaxi Found, Trip Finished, Payment Saved
   */
  success: () => {
    triggerVibrate([20, 40, 30, 40, 50]);
  },

  /**
   * Rhythmic Radar / Incoming Request Alert (40ms, 80ms pause, 40ms, 80ms pause, 60ms)
   * Use when searching for drivers or receiving a driver request
   */
  notification: () => {
    triggerVibrate([40, 80, 40, 80, 60]);
  },

  /**
   * Double sharp error pulse (45ms, 60ms pause, 45ms)
   * Use for ride cancellation or GPS error
   */
  error: () => {
    triggerVibrate([45, 60, 45]);
  },

  /**
   * Driver Incoming Request: Strong heavy vibration (150ms, 50ms pause, 150ms, 50ms pause, 200ms)
   */
  driverIncoming: () => {
    triggerVibrate([150, 50, 150, 50, 200]);
  },

  /**
   * Driver Urgent <= 5s Warning: Strong continuous vibration pattern
   */
  driverUrgent5s: () => {
    triggerVibrate([250, 100, 250, 100, 250]);
  },

  /**
   * Short countdown tick (15ms)
   */
  countdownTick: () => {
    triggerVibrate(15);
  },
};
