'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { notifications } from '@/utils/notifications';
import { DynamicIslandBannerData } from '@/components/shared/IosDynamicIslandNotification';

export const useWalletNotificationListener = () => {
  const {
    user,
    loginUser,
    pendingRecharge,
    setPendingRecharge,
    addWalletNotification,
  } = useAppStore();

  const [activeBanner, setActiveBanner] = useState<DynamicIslandBannerData | null>(null);
  const handledRechargeIdRef = useRef<string | null>(null);

  const handleCloseBanner = useCallback(() => {
    setActiveBanner(null);
  }, []);

  useEffect(() => {
    if (!pendingRecharge || !pendingRecharge.id) return;
    const rechargeId = pendingRecharge.id;

    // Avoid double handling of the same recharge
    if (handledRechargeIdRef.current === rechargeId) return;

    const unsubscribe = apiService.subscribeToRecharge(rechargeId, async (recharge) => {
      if (!recharge || !recharge.status) return;

      if (recharge.status === 'APPROVED' && handledRechargeIdRef.current !== rechargeId) {
        handledRechargeIdRef.current = rechargeId;

        const amount = Number(recharge.amount) || pendingRecharge.amount || 0;
        // El servidor ya acreditó el saldo al aprobar: se lee de Firestore (fuente única),
        // así nunca se suma dos veces aunque también lo actualice el modal de recarga.
        const serverBalance = user ? await apiService.fetchWalletBalance(user.id) : null;
        const currentBal = typeof user?.walletBalance === 'number' ? user.walletBalance : 0;
        const newBalance = serverBalance ?? currentBal;
        const timeStr = new Date().toLocaleTimeString('es-BO', {
          timeZone: 'America/La_Paz',
          hour: '2-digit',
          minute: '2-digit',
        });
        const dateStr = new Date().toLocaleDateString('es-BO', {
          timeZone: 'America/La_Paz',
          day: '2-digit',
          month: 'short',
        });

        // 1. Update user balance in store
        if (user) {
          loginUser({
            ...user,
            walletBalance: newBalance,
          });
        }

        // 2. Set dynamic island banner
        setActiveBanner({
          id: `banner-${rechargeId}`,
          type: 'WALLET_APPROVED',
          title: `¡Recarga Aprobada! (+${amount.toFixed(2)} BOB)`,
          subtitle: `Tu nuevo saldo es ${newBalance.toFixed(2)} BOB. ¡Listo para trabajar!`,
          amount,
          time: timeStr,
        });

        // 3. Send system notification if user is outside app or in background
        notifications.sendNativeNotification(
          `✅ RiberGO: ¡Recarga Aprobada! (+${amount} BOB)`,
          `Tu saldo de ${newBalance.toFixed(2)} BOB ya está disponible en tu billetera.`,
          '/logo.png'
        );

        // 4. Save to persistent chat messages for the Billetera channel
        addWalletNotification({
          id: `notif-${rechargeId}`,
          title: `Recarga Aprobada (+${amount.toFixed(2)} BOB)`,
          message: `Tu comprobante de recarga por QR ha sido verificado y aprobado con éxito por administración. Se acreditaron ${amount.toFixed(2)} BOB a tu cuenta. Saldo actual: ${newBalance.toFixed(2)} BOB.`,
          amount,
          newBalance,
          date: dateStr,
          time: timeStr,
          rechargeId,
          read: false,
          status: 'APPROVED',
        });

        // 5. Clear pending recharge
        setPendingRecharge(null);
      } else if (recharge.status === 'REJECTED' && handledRechargeIdRef.current !== rechargeId) {
        handledRechargeIdRef.current = rechargeId;

        const timeStr = new Date().toLocaleTimeString('es-BO', {
          timeZone: 'America/La_Paz',
          hour: '2-digit',
          minute: '2-digit',
        });
        const dateStr = new Date().toLocaleDateString('es-BO', {
          timeZone: 'America/La_Paz',
          day: '2-digit',
          month: 'short',
        });

        // Show rejection banner
        setActiveBanner({
          id: `banner-rej-${rechargeId}`,
          type: 'WALLET_REJECTED',
          title: 'Recarga No Aprobada',
          subtitle: 'Comprobante no coincide o no figura en la cuenta receptora.',
          time: timeStr,
        });

        notifications.sendNativeNotification(
          '❌ RiberGO: Recarga no aprobada',
          'Tu comprobante no pudo ser verificado. Contacta a soporte para más detalles.',
          '/logo.png'
        );

        addWalletNotification({
          id: `notif-${rechargeId}`,
          title: 'Recarga Rechazada',
          message: 'Tu solicitud de recarga no pudo ser aprobada porque el dinero no figura en la cuenta receptora o los datos del comprobante no coinciden.',
          amount: pendingRecharge.amount,
          newBalance: typeof user?.walletBalance === 'number' ? user.walletBalance : 0,
          date: dateStr,
          time: timeStr,
          rechargeId,
          read: false,
          status: 'REJECTED',
        });

        setPendingRecharge(null);
      }
    });

    return () => unsubscribe();
  }, [pendingRecharge, user, loginUser, setPendingRecharge, addWalletNotification]);

  return {
    activeBanner,
    handleCloseBanner,
  };
};
