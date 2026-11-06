import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9299311110:AAGICHR74xGvZThQP-U2Mbf2Fr0VTB2WN2U';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // 1. Manejo de mensajes de texto (ej. /start para registrar el Chat ID del Administrador)
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = (update.message.text || '').trim();
      const senderName = update.message.from?.first_name || 'Administrador';

      // Guardar el Chat ID en Firestore si es posible (resiliente a permisos)
      try {
        await setDoc(
          doc(db, 'system_config', 'telegram_admin'),
          {
            chatId: String(chatId),
            adminName: senderName,
            updatedAt: serverTimestamp(),
            updatedAtMs: Date.now(),
          },
          { merge: true }
        );
      } catch (fsErr) {
        console.warn('Advertencia guardando telegram_admin en Firestore:', fsErr);
      }

      // Responder con mensaje de confirmación
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `👋 ¡Hola ${senderName}!\n\n✅ Tu cuenta de administrador ha sido vinculada exitosamente con *RiberGO*.\n\n📱 *Chat ID:* \`${chatId}\`\n\nA partir de este momento, cada vez que un conductor suba un comprobante de recarga por QR (Yasta / Al Toque), recibirás aquí la foto y podrás *Aprobar* o *Rechazar* con 1 solo toque.`,
          parse_mode: 'Markdown',
        }),
      });

      return NextResponse.json({ ok: true });
    }

    // 2. Manejo de botones de acción rápida [ ✅ Aprobar ] o [ ❌ Rechazar ]
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackId = callbackQuery.id;
      const data = callbackQuery.data || '';
      const message = callbackQuery.message;
      const chatId = message?.chat?.id;
      const messageId = message?.message_id;

      const [action, rechargeId] = data.split(':');

      if (!rechargeId || (action !== 'approve' && action !== 'reject')) {
        await answerCallback(callbackId, 'Acción inválida');
        return NextResponse.json({ ok: true });
      }

      let recharge: any = null;
      const rechargeRef = doc(db, 'wallet_recharges', rechargeId);
      try {
        const rechargeSnap = await getDoc(rechargeRef);
        if (rechargeSnap.exists()) {
          recharge = rechargeSnap.data();
        }
      } catch (err) {
        console.warn('Advertencia leyendo recharge de Firestore:', err);
      }

      if (recharge && recharge.status === 'APPROVED') {
        await answerCallback(callbackId, '⚠️ Esta recarga ya fue aprobada previamente.');
        return NextResponse.json({ ok: true });
      }

      if (recharge && recharge.status === 'REJECTED') {
        await answerCallback(callbackId, '⚠️ Esta recarga ya fue rechazada previamente.');
        return NextResponse.json({ ok: true });
      }

      const timeStr = new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

      // Obtener amount y driverId ya sea de Firestore o de los datos del mensaje
      let amount = recharge ? (Number(recharge.amount) || 0) : 0;
      let driverId = recharge ? recharge.driverId : '';

      if ((!amount || !driverId) && message?.caption) {
        const idMatch = message.caption.match(/ID Conductor:\* `([^`]+)`/);
        if (idMatch) driverId = idMatch[1];
        const amountMatch = message.caption.match(/Monto Solicitado:\* \*([0-9.]+)\s*BOB\*/);
        if (amountMatch) amount = Number(amountMatch[1]) || 0;
      }

      if (action === 'approve') {
        // 1. Marcar recarga como aprobada en Firestore
        try {
          await updateDoc(rechargeRef, {
            status: 'APPROVED',
            approvedAtMs: Date.now(),
            approvedAt: serverTimestamp(),
          });
        } catch (fsErr) {
          console.warn('No se pudo actualizar estado de wallet_recharge en Firestore:', fsErr);
        }

        // 2. Incrementar saldo atómicamente en el documento del conductor
        if (driverId && amount > 0) {
          try {
            const userDocRef = doc(db, 'users', driverId);
            await updateDoc(userDocRef, {
              walletBalance: increment(amount),
            }).catch(async () => {
              await setDoc(userDocRef, { walletBalance: amount }, { merge: true });
            });
          } catch (userErr) {
            console.warn('No se pudo actualizar saldo en users Firestore:', userErr);
          }
        }

        // 3. Responder al click en Telegram
        await answerCallback(callbackId, `✅ ¡Recarga de ${amount} BOB aprobada con éxito!`);

        // 4. Actualizar el mensaje en Telegram para quitar los botones y mostrar el sello de aprobación
        if (chatId && messageId) {
          const originalCaption = message.caption || '';
          const newCaption = `${originalCaption}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ *RECARGA APROBADA (+${amount} BOB)*\n👤 Aprobado por el Administrador a las ${timeStr} hrs.\n💰 Saldo acreditado al conductor inmediatamente.`;

          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageCaption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              caption: newCaption,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [] }, // Eliminar los botones
            }),
          });
        }
      } else if (action === 'reject') {
        // 1. Marcar recarga como rechazada en Firestore
        try {
          await updateDoc(rechargeRef, {
            status: 'REJECTED',
            rejectedAtMs: Date.now(),
            rejectedAt: serverTimestamp(),
          });
        } catch (fsErr) {
          console.warn('No se pudo actualizar estado rejected en Firestore:', fsErr);
        }

        // 2. Responder al click en Telegram
        await answerCallback(callbackId, '❌ Recarga rechazada.');

        // 3. Actualizar el mensaje en Telegram para quitar los botones y mostrar sello de rechazo
        if (chatId && messageId) {
          const originalCaption = message.caption || '';
          const newCaption = `${originalCaption}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n❌ *RECARGA RECHAZADA*\n👤 Rechazado por el Administrador a las ${timeStr} hrs.\n⚠️ Motivo: Comprobante no coincide o no figura en la cuenta receptora.`;

          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageCaption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              caption: newCaption,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [] },
            }),
          });
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error handling Telegram webhook:', err);
    // Siempre responder 200 a Telegram para que no repita peticiones fallidas en bucle
    return NextResponse.json({ ok: true, handledError: err?.message });
  }
}

async function answerCallback(callbackQueryId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: true,
      }),
    });
  } catch (e) {
    console.warn('Error answering Telegram callback query:', e);
  }
}
