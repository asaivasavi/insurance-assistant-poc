# Insurance Assistant POC
## Build Log

### Auth flow: caller_phone hallucination fix
While building the authentication flow (verify_identity → send_otp → verify_otp), the Playbook's LLM would invent a placeholder phone number (e.g. +1234567890) instead of using the real caller_phone value, even when explicitly instructed not to.

Root cause: Dialogflow CX Playbooks don't automatically receive session parameters — a Flow must explicitly transition into the Playbook with the parameter mapped as an Input Parameter of the same name. The Playbook's declared Input Parameter (`caller_phone`) had no actual data source wired to it.

Fix: In Default Start Flow's Start Page, added a Parameter preset on the Default Welcome Intent route:
`caller_phone = $session.params.telephony.caller_id`
This maps the real caller ID (populated automatically by Phone Gateway on real calls) into `caller_phone` at the Flow → Playbook transition, which CX then correctly propagates as a genuine Playbook input parameter.

Secondary bug found in the same session: the Playbook was also verbally claiming to have sent an OTP without actually invoking the send_otp tool. Fixed by making the Instructions explicitly mandatory: "you MUST call the tool before describing its outcome to the user."