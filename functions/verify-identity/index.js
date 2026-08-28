const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({ projectId: 'insurance-assistant-poc' });

// Normalizes phone numbers for comparison (strips spaces, dashes, parens)
function normalizePhone(phone) {
  return phone.replace(/[\s\-()]/g, '');
}

// Normalizes spoken DOB into YYYY-MM-DD
// Accepts things like "1995-03-15", "March 15 1995", "03/15/1995"
function normalizeDob(dobInput) {
  const parsed = new Date(dobInput);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0]; // YYYY-MM-DD
}

functions.http('verifyIdentity', async (req, res) => {
  const params = req.body.sessionInfo?.parameters || req.body;
  // caller_phone comes from Phone Gateway's caller ID automatically —
  // Playbook should map this from the call's built-in $sys.caller-id or similar session param
  const { caller_phone, dob_input } = params;

  if (!caller_phone || !dob_input) {
    return res.status(400).json({ error: 'caller_phone and dob_input are required' });
  }

  const normalizedPhone = normalizePhone(caller_phone);
  const normalizedDob = normalizeDob(dob_input);

  if (!normalizedDob) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I didn't quite catch that date — could you say your date of birth again, like month, day, and year?"] } }]
      },
      sessionInfo: { parameters: { identity_verified: false } }
    });
  }

  const snapshot = await db.collection('policyholders')
    .where('phone', '==', normalizedPhone)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["I couldn't find a policy linked to this number. Let me transfer you to an agent who can help."] } }]
      },
      sessionInfo: { parameters: { identity_verified: false } }
    });
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  if (data.dob !== normalizedDob) {
    return res.json({
      fulfillment_response: {
        messages: [{ text: { text: ["That date of birth doesn't match our records. Could you try again?"] } }]
      },
      sessionInfo: { parameters: { identity_verified: false } }
    });
  }

  res.json({
    fulfillment_response: {
      messages: [{ text: { text: [`Thanks, ${data.full_name}! Sending a verification code now.`] } }]
    },
    sessionInfo: {
      parameters: {
        identity_verified: true,
        policyholder_id: doc.id,
        phone: data.phone,
        full_name: data.full_name
      }
    }
  });
});