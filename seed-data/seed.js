const { Firestore } = require('@google-cloud/firestore');

const db = new Firestore({
  projectId: 'insurance-assistant-poc',
});

const policyholders = [
  {
    id: 'PH001',
    full_name: 'Sainatha Vasavi',
    dob: '1995-03-15',
    phone: '+12367773293',
    policy: {
      policy_number: 'POL-10234',
      type: 'Health',
      status: 'Active',
      renewal_date: '2027-02-01',
      coverage: '$500,000'
    },
    payments: {
      last_payment_date: '2026-08-01',
      last_payment_amount: 220,
      next_due_date: '2026-09-01',
      autopay_enabled: true
    },
    claims: [
      {
        claim_id: 'CLM-4471',
        status: 'Under review',
        submitted_date: '2026-07-28',
        expected_decision_date: '2026-08-15',
        type: 'Hospitalization'
      }
    ],
    beneficiaries: [
      { name: 'Ravi Kumar', relationship: 'Spouse', allocation_percent: 100 }
    ]
  },
  {
    id: 'PH002',
    full_name: 'Arjun Mehta',
    dob: '1988-11-02',
    phone: '+16045550111',
    policy: {
      policy_number: 'POL-10987',
      type: 'Life',
      status: 'Active',
      renewal_date: '2026-12-10',
      coverage: '$1,000,000'
    },
    payments: {
      last_payment_date: '2026-07-15',
      last_payment_amount: 450,
      next_due_date: '2026-08-15',
      autopay_enabled: false
    },
    claims: [],
    beneficiaries: [
      { name: 'Priya Mehta', relationship: 'Spouse', allocation_percent: 60 },
      { name: 'Kavya Mehta', relationship: 'Daughter', allocation_percent: 40 }
    ]
  },
  {
    id: 'PH003',
    full_name: 'Lena Fischer',
    dob: '1979-06-23',
    phone: '+17785550199',
    policy: {
      policy_number: 'POL-11250',
      type: 'Auto',
      status: 'Lapsed',
      renewal_date: '2026-06-01',
      coverage: '$50,000'
    },
    payments: {
      last_payment_date: '2026-05-01',
      last_payment_amount: 130,
      next_due_date: '2026-06-01',
      autopay_enabled: false
    },
    claims: [
      {
        claim_id: 'CLM-3390',
        status: 'Approved',
        submitted_date: '2026-04-10',
        expected_decision_date: '2026-04-25',
        type: 'Collision'
      }
    ],
    beneficiaries: []
  }
];

async function seed() {
  for (const ph of policyholders) {
    const { id, ...data } = ph;
    await db.collection('policyholders').doc(id).set(data);
    console.log(`Seeded ${id} — ${data.full_name}`);
  }
  console.log('Done seeding.');
}

seed().catch(console.error);