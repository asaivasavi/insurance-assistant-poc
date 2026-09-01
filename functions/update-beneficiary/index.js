const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('updateBeneficiary', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id, beneficiary_name, relationship, allocation_percent } = params;

  if (!policyholder_id || !beneficiary_name || !relationship || allocation_percent === undefined) {
    return res.status(400).json({
      error: 'policyholder_id, beneficiary_name, relationship, and allocation_percent are required'
    });
  }

  const docRef = db.collection('policyholders').doc(policyholder_id);
  const doc = await docRef.get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your account to update beneficiaries."] } }]
      },
      sessionInfo: { parameters: { beneficiary_updated: false } }
    });
  }

  const parsedAllocation = Number(allocation_percent);

  const newBeneficiary = {
    name: beneficiary_name,
    relationship: relationship,
    allocation_percent: parsedAllocation
  };

  // For this POC: adding a new beneficiary appends to the list rather than replacing it.
  // A production system would need full allocation validation (percentages summing to 100).
  const existingBeneficiaries = doc.data().beneficiaries || [];

  await docRef.update({
    beneficiaries: [...existingBeneficiaries, newBeneficiary]
  });

  res.json({
    fulfillment_response: {
      messages: [{
        text: {
          text: [`I've added ${beneficiary_name} (${relationship}) as a beneficiary with ${parsedAllocation}% allocation.`]
        }
      }]
    },
    sessionInfo: {
      parameters: {
        beneficiary_updated: true,
        beneficiary_name: beneficiary_name
      }
    }
  });
});