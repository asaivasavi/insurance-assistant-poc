# Insurance Assistant POC

An agentic voice/chat insurance assistant built with Dialogflow CX Playbooks, Generators, and Cloud Functions tool-calling — a portfolio project demonstrating end-to-end agentic AI system design.

## Overview

This is a proof-of-concept insurance customer service assistant supporting both voice (IVR) and chat channels. It authenticates callers, then handles policy lookups, payments, autopay management, claims, and more — using Dialogflow CX's agentic Playbook architecture rather than a traditional decision-tree chatbot.

## Architecture

- **Orchestration:** Dialogflow CX Playbooks (LLM-driven, not classic Flows) — the model reasons about intent and tool selection at runtime
- **Sub-playbooks:** Domain-specific playbooks (Payments, Claims, etc.) that the main Orchestrator hands off to, each owning its own tools
- **Tools:** Cloud Functions (Node.js) exposed via OpenAPI schemas, called by the Playbook via function-calling
- **Data:** Firestore (Native mode) — policyholder records, OTP sessions
- **Auth:** Phone number (from caller ID via Phone Gateway) + spoken date of birth, followed by a one-time code (mocked for this POC — logged, not sent via real SMS)

See `insurance-bot-architecture.html` for the full visual architecture diagram.

## Current status

- ✅ Authentication flow: `verify_identity`, `send_otp`, `verify_otp` — built, tested, deployed
- ✅ Payments Sub-Playbook: `get_policy_details`, `get_payment_status`, `make_payment`, `manage_autopay` — built, tested, deployed, hand-off working
- ⬜ Claims/Loans Sub-Playbook — not yet built
- ⬜ Beneficiary/Documents Sub-Playbook — not yet built
- ⬜ Provider/Eligibility Sub-Playbook — not yet built
- ⬜ FAQ Generator (RAG via Vertex AI Search Data Store) — not yet built
- ⬜ Live agent escalation tool — not yet built
- ⬜ Phone Gateway voice channel — configured for parameter mapping, not yet tested with a real call

## Tech stack

- Dialogflow CX (Playbooks, Sub-playbooks, Tools, Data Store agents)
- Google Cloud Functions (Node.js 20)
- Firestore (Native mode)
- Google Cloud Phone Gateway (planned)
- Vertex AI Search (planned, for RAG/FAQ)

## Project structure
insurance-assistant-poc/
├── functions/
│ ├── verify-identity/
│ ├── send-otp/
│ ├── verify-otp/
│ ├── get-policy-details/
│ ├── get-payment-status/
│ ├── make-payment/
│ └── manage-autopay/
├── seed-data/
│ └── seed.js
└── README.md


## Setup

1. Create a GCP project, enable Dialogflow CX, Vertex AI, Cloud Functions, Cloud Build, Firestore APIs
2. Create a Firestore database (Native mode)
3. Run `seed-data/seed.js` to populate fake policyholder records
4. Deploy each function in `functions/` individually:
```bash
cd functions/<function-folder>
gcloud functions deploy <entryPointName> \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region=us-central1 \
  --source=. \
  --entry-point=<entryPointName> \
  --project=<your-project-id>
```
5. In Dialogflow CX console, create matching OpenAPI Tools pointing at each deployed function's URL, and attach them to the appropriate Playbook/Sub-Playbook

## Build Log

### Auth flow: caller_phone hallucination fix
While building the authentication flow (verify_identity → send_otp → verify_otp), the Playbook's LLM would invent a placeholder phone number (e.g. +1234567890) instead of using the real caller_phone value, even when explicitly instructed not to.

Root cause: Dialogflow CX Playbooks don't automatically receive session parameters — a Flow must explicitly transition into the Playbook with the parameter mapped as an Input Parameter of the same name. The Playbook's declared Input Parameter (`caller_phone`) had no actual data source wired to it.

Fix: In Default Start Flow's Start Page, added a Parameter preset on the Default Welcome Intent route:
`caller_phone = $session.params.telephony.caller_id`
This maps the real caller ID (populated automatically by Phone Gateway on real calls) into `caller_phone` at the Flow → Playbook transition, which CX then correctly propagates as a genuine Playbook input parameter.

Secondary bug found in the same session: the Playbook was also verbally claiming to have sent an OTP without actually invoking the send_otp tool. Fixed by making the Instructions explicitly mandatory: "you MUST call the tool before describing its outcome to the user."

### Payments Sub-Playbook: policyholder_id hand-off fix
The same class of bug reappeared one level up: when the Orchestrator handed off to the Payments Sub-Playbook, `policyholder_id` wasn't being passed through, so tools like `get_policy_details` received a hallucinated placeholder ID instead of the real authenticated one.

Fix: declared `policyholder_id` as an explicit Input Parameter on the Payments Sub-Playbook, and updated the Orchestrator's hand-off instruction to explicitly state: "hand off to the Payments Sub-Playbook, passing the real policyholder_id obtained earlier from verify_identity... never invent, guess, or use a placeholder value." Confirmed fixed — the Simulator showed the real policyholder_id correctly propagating in the invocation payload.

**General lesson:** in Dialogflow CX Playbooks, any value that needs to cross a Flow→Playbook or Playbook→Sub-Playbook boundary must be explicitly named and instructed to be carried across — declaring an Input Parameter alone does not wire in real data. Telling the model "don't hallucinate" doesn't fix a genuine data-delivery gap.