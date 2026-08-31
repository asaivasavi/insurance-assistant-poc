const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('makePayment', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id, amount } = params;

  if (!policyholder_id || !amount) {
    return res.status(400).json({ error: 'policyholder_id and amount are required' });
  }

  const docRef = db.collection('policyholders').doc(policyholder_id);
  console.log("docRef", docRef);
  const doc = await docRef.get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your account to process that payment."] } }]
      },
      sessionInfo: { parameters: { payment_success: false } }
    });
  }

  // Simulate payment processing (no real payment gateway for this POC)
  const confirmationId = 'PMT-' + Math.floor(100000 + Math.random() * 900000);
  const today = new Date().toISOString().split('T')[0];
  console.log("date", new Date());
  console.log("date to string", new Date().toISOString());
  // Calculate next due date as one month later (simple approximation)
  const nextDue = new Date();
  console.log("nextDue", nextDue);
  nextDue.setMonth(nextDue.getMonth() + 1);
  console.log(nextDue);
  const nextDueDate = nextDue.toISOString().split('T')[0];
  console.log("nextDueDate", nextDueDate);
  await docRef.update({
    'payments.last_payment_date': today,
    'payments.last_payment_amount': Number(amount),
    'payments.next_due_date': nextDueDate
  });

  res.json({
    fulfillment_response: {
      messages: [{
        text: {
          text: [`Your payment of ${amount} has been processed. Confirmation number is ${confirmationId}. Your next payment will be due on ${nextDueDate}.`]
        }
      }]
    },
    sessionInfo: {
      parameters: {
        payment_success: true,
        confirmation_id: confirmationId,
        next_due_date: nextDueDate
      }
    }
  });
});            