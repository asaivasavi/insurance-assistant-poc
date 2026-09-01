const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('getLoanInquiry', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id } = params;

  if (!policyholder_id) {
    return res.status(400).json({ error: 'policyholder_id is required' });
  }

  const doc = await db.collection('policyholders').doc(policyholder_id).get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your policy to check loan eligibility."] } }]
      },
      sessionInfo: { parameters: { loan_eligible: false } }
    });
  }

  const policy = doc.data().policy || {};

  // Only Life policies with cash value are eligible for policy loans (simplified rule for POC)
  if (policy.type !== 'Life') {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: [`Policy loans are only available on Life insurance policies. Your policy is a ${policy.type} policy, so it isn't eligible.`] } }]
      },
      sessionInfo: { parameters: { loan_eligible: false } }
    });
  }

  // Simplified: loan amount available = 10% of coverage, for demo purposes
  const coverageNumber = Number(String(policy.coverage).replace(/[^0-9.]/g, '')) || 0;
  const availableLoanAmount = Math.round(coverageNumber * 0.10);

  res.json({
    fulfillment_response: {
      messages: [{
        text: {
          text: [`Based on your Life policy's cash value, you're eligible for a loan of up to $${availableLoanAmount.toLocaleString()}, at a standard policy loan interest rate. Would you like to proceed?`]
        }
      }]
    },
    sessionInfo: {
      parameters: {
        loan_eligible: true,
        available_loan_amount: availableLoanAmount
      }
    }
  });
});