const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('getBeneficiaryInfo', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id } = params;

  if (!policyholder_id) {
    return res.status(400).json({ error: 'policyholder_id is required' });
  }

  const doc = await db.collection('policyholders').doc(policyholder_id).get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your beneficiary information."] } }]
      },
      sessionInfo: { parameters: { beneficiaries_found: false } }
    });
  }

  const beneficiaries = doc.data().beneficiaries || [];

  if (beneficiaries.length === 0) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["You don't have any beneficiaries listed on your policy."] } }]
      },
      sessionInfo: { parameters: { beneficiaries_found: false } }
    });
  }

  const summary = beneficiaries
    .map(b => `${b.name} (${b.relationship}), ${b.allocation_percent}%`)
    .join('; ');

  res.json({
    fulfillment_response: {
      messages: [{ text: { text: [`Your listed beneficiaries are: ${summary}.`] } }]
    },
    sessionInfo: {
      parameters: {
        beneficiaries_found: true,
        beneficiary_count: beneficiaries.length,
        beneficiaries_summary: summary
      }
    }
  });
});