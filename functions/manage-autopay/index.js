const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('manageAutopay', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id, enable_autopay } = params;

  if (!policyholder_id || enable_autopay === undefined) {
    return res.status(400).json({ error: 'policyholder_id and enable_autopay are required' });
  }

  function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
  }   
  console.log("enable_autopay", toBoolean(enable_autopay));
  const parsed_enable_autopay= toBoolean(enable_autopay);
  const docRef = db.collection('policyholders').doc(policyholder_id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your account to update autopay."] } }]
      },
      sessionInfo: { parameters: { autopay_updated: false } }
    });
  }


  await docRef.update({
    'payments.autopay_enabled': parsed_enable_autopay
  });

  const statusText = parsed_enable_autopay ? 'turned on' : 'turned off';

  res.json({
    fulfillment_response: {
      messages: [{ text: { text: [`Autopay has been ${statusText} for your policy.`] } }]
    },
    sessionInfo: {
      parameters: {
        autopay_updated: true,
        autopay_enabled: parsed_enable_autopay
      }
    }
  });
});