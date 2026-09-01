const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('fileClaim', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id, claim_type, description } = params;

  if (!policyholder_id || !claim_type) {
    return res.status(400).json({ error: 'policyholder_id and claim_type are required' });
  }

  const docRef = db.collection('policyholders').doc(policyholder_id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your account to file a claim."] } }]
      },
      sessionInfo: { parameters: { claim_filed: false } }
    });
  }

  const newClaimId = 'CLM-' + Math.floor(1000 + Math.random() * 9000);
  const today = new Date().toISOString().split('T')[0];
  const expectedDecision = new Date();
  expectedDecision.setDate(expectedDecision.getDate() + 14); // 2 weeks out
  const expectedDecisionDate = expectedDecision.toISOString().split('T')[0];

  const newClaim = {
    claim_id: newClaimId,
    status: 'Submitted',
    submitted_date: today,
    expected_decision_date: expectedDecisionDate,
    type: claim_type,
    description: description || ''
  };

  const existingClaims = doc.data().claims || [];

  await docRef.update({
    claims: [newClaim, ...existingClaims]
  });

  res.json({
    fulfillment_response: {
      messages: [{
        text: {
          text: [`Your claim has been filed. Your claim number is ${newClaimId}. We expect a decision by ${expectedDecisionDate}.`]
        }
      }]
    },
    sessionInfo: {
      parameters: {
        claim_filed: true,
        claim_id: newClaimId,
        expected_decision_date: expectedDecisionDate
      }
    }
  });
});