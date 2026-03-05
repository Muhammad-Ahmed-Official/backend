import admin from 'firebase-admin';
import { getFirebaseApp } from '../config/firebase.js';
import { supabase } from '../config/supabase.js';

/**
 * Send a push notification to a single user by their userId.
 * Looks up their push_token from the users table.
 */
export async function sendPushToUser(userId, { title, body, data = {} }) {
  const app = getFirebaseApp();
  if (!app) return;

  // Get push token for this user
  const { data: userData, error } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .maybeSingle();

  if (error || !userData?.push_token) return;

  await sendPushToToken(userData.push_token, { title, body, data });
}

/**
 * Send a push notification directly to a device token.
 */
export async function sendPushToToken(token, { title, body, data = {} }) {
  const app = getFirebaseApp();
  if (!app || !token) return;

  // Convert all data values to strings (FCM requirement)
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  try {
    await admin.messaging(app).send({
      token,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'default' },
      },
      apns: {
        payload: { aps: { badge: 1, sound: 'default' } },
      },
    });
  } catch (e) {
    // Token may be expired or invalid — log but don't crash
    console.warn('[FCM] Push send failed:', e.message);
  }
}
