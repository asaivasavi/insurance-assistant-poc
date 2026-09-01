const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('checkClaimStatus', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id, claim_id } = params;

  if (!policyholder_id) {
    return res.status(400).json({ error: 'policyholder_id is required' });
  }

  const doc = await db.collection('policyholders').doc(policyholder_id).get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your claims information."] } }]
      },
      sessionInfo: { parameters: { claims_found: false } }
    });
  }

  const claims = doc.data().claims || [];

  if (claims.length === 0) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["You don't have any claims on file."] } }]
      },
      sessionInfo: { parameters: { claims_found: false } }
    });
  }

  // If a specific claim_id was given, find that one; otherwise return the most recent
  let claim = claims[0];
  if (claim_id) {
    const match = claims.find(c => c.claim_id === claim_id);
    if (match) claim = match;
  }

  res.json({
    fulfillment_response: {
      messages: [{
        text: {
          text: [`Claim ${claim.claim_id} (${claim.type}) is currently ${claim.status}. It was submitted on ${claim.submitted_date}, with an expected decision by ${claim.expected_decision_date}.`]
        }
      }]
    },
    sessionInfo: {
      parameters: {
        claims_found: true,
        claim_id: claim.claim_id,
        claim_status: claim.status,
        claim_type: claim.type,
        submitted_date: claim.submitted_date,
        expected_decision_date: claim.expected_decision_date
      }
    }
  });
});