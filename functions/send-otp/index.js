const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('sendOtp', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id } = params;

  if (!policyholder_id) {
    return res.status(400).json({ error: 'policyholder_id is required' });
  }

  // Generate 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes

  await db.collection('otp_sessions').doc(policyholder_id).set({
    otp_code: otp,
    created_at: now,
    expires_at: expiresAt,
    verified: false
  });

  // Mock "delivery" — logs instead of sending real SMS (no Twilio needed for POC)
  console.log(`[MOCK OTP] Code for ${policyholder_id}: ${otp}`);

  res.json({
    fulfillment_response: {
      messages: [
        { text: { text: ["I've sent a verification code to your registered number. Please read it back to me."] } }
      ]
    },
    sessionInfo: {
      parameters: { otp_sent: true }
    }
  });
});