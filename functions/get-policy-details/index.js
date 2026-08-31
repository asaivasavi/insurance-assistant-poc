const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('getPolicyDetails', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id } = params;

  if (!policyholder_id) {
    return res.status(400).json({ error: 'policyholder_id is required' });
  }

  const doc = await db.collection('policyholders').doc(policyholder_id).get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your policy details right now."] } }]
      },
      sessionInfo: { parameters: { policy_found: false } }
    });
  }

  const data = doc.data();
  const policy = data.policy || {};

  res.json({
    fulfillment_response: {
      messages: [{
        text: {
          text: [`Your ${policy.type} policy (${policy.policy_number}) is currently ${policy.status}, with coverage of ${policy.coverage}. It renews on ${policy.renewal_date}.`]
        }
      }]
    },
    sessionInfo: {
      parameters: {
        policy_found: true,
        policy_type: policy.type,
        policy_status: policy.status,
        policy_coverage: policy.coverage,
        renewal_date: policy.renewal_date
      }
    }
  });
});