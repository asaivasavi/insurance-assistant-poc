
const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

functions.http('requestDocument', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  const { policyholder_id, document_type } = params;

  if (!policyholder_id || !document_type) {
    return res.status(400).json({ error: 'policyholder_id and document_type are required' });
  }

  const doc = await db.collection('policyholders').doc(policyholder_id).get();

  if (!doc.exists) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find your account to process that document request."] } }]
      },
      sessionInfo: { parameters: { document_requested: false } }
    });
  }

  // Simulate document generation (no real PDF/email/storage for this POC)
  const requestId = 'DOC-' + Math.floor(100000 + Math.random() * 900000);

  // Log the request for record-keeping (simulating a request queue)
  await db.collection('document_requests').doc(requestId).set({
    policyholder_id,
    document_type,
    requested_at: new Date().toISOString(),
    status: 'processing'
  });

  res.json({
    fulfillment_response: {
      messages: [{
        text: {
          text: [`I've requested your ${document_type} document. Your reference number is ${requestId}. It will be sent to your email on file within 1-2 business days.`]
        }
      }]
    },
    sessionInfo: {
      parameters: {
        document_requested: true,
        request_id: requestId
      }
    }
  });
});