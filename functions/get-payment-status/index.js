const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('getPaymentStatus', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id } = params;

  if (!policyholder_id) {
    return res.status(400).json({ error: 'policyholder_id is required' });
  }

  const doc = await db.collection('policyholders').doc(policyholder_id).get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your payment information right now."] } }]
      },
      sessionInfo: { parameters: { payment_found: false } }
    });
  }

  const payments = doc.data().payments || {};

  const autopayText = payments.autopay_enabled ? 'Autopay is currently on' : 'Autopay is currently off';

  res.json({
    fulfillment_response: {
      messages: [{
        text: {
          text: [`Your last payment of ${payments.last_payment_amount} was on ${payments.last_payment_date}. Your next payment of the same amount is due on ${payments.next_due_date}. ${autopayText}.`]
        }
      }]
    },
    sessionInfo: {
      parameters: {
        payment_found: true,
        last_payment_amount: payments.last_payment_amount,
        last_payment_date: payments.last_payment_date,
        next_due_date: payments.next_due_date,
        autopay_enabled: payments.autopay_enabled
      }
    }
  });
});