const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('verifyOtp', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id, otp_input } = params;

  if (!policyholder_id || !otp_input) {
    return res.status(400).json({ error: 'policyholder_id and otp_input are required' });
  }

  const doc = await db.collection('otp_sessions').doc(policyholder_id).get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I don't have a code on file for you — let me send a new one."] } }]
      },
      sessionInfo: { parameters: { auth_verified: false } }
    });
  }

  const data = doc.data();
  const isExpired = Date.now() > data.expires_at;
  const isMatch = data.otp_code === otp_input;

  if (isExpired) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["That code has expired. Let me send you a new one."] } }]
      },
      sessionInfo: { parameters: { auth_verified: false } }
    });
  }

  if (!isMatch) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["That code doesn't match. Could you try again?"] } }]
      },
      sessionInfo: { parameters: { auth_verified: false } }
    });
  }

  await db.collection('otp_sessions').doc(policyholder_id).update({ verified: true });

  res.json({
    fulfillment_response: {
      messages: [{ text: { text: ["You're verified. How can I help you today?"] } }]
    },
    sessionInfo: { parameters: { auth_verified: true } }
  });
});