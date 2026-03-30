Objective:
Assess incentive and abuse dynamics in indexed outputs and downstream consumer contracts.

Review priorities:
- Attribution/accounting surfaces that can be strategically manipulated for visibility or rewards.
- Economic assumptions in projected fields that can diverge from onchain truth under adversarial behavior.
- Friction asymmetry where abusive indexing/query patterns are cheaper than honest usage.
- Downstream-consumer risks when display fields are mistaken for canonical accounting data.
- Timing windows (event ordering, delayed activation jobs) that can create exploitable interpretation gaps.

Expected output:
- Concrete abuse scenarios with suggested mitigations and tradeoffs.


Patch-file output:
- Please return your final response as a single `.patch` file attachment with a `.patch` filename rather than as a normal prose review.
- Put all actionable fixes into one unified diff that we can download and apply directly.
- Limit the patch to concrete changes that fit this review scope, and keep the diff self-contained.
- If there are important residual concerns that you did not change, list them briefly outside the patch.
- If you find no actionable issues, say so explicitly instead of inventing a patch.
