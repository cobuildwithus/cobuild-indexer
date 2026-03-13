Objective:
Audit reliability and operational safety for this event-driven indexer and query surface.

Focus:
- Validate replay safety and determinism of handler decisions.
- Check resilience around RPC transport failures, retries, and timeout behavior.
- Identify schema evolution risks that can break handler writes or downstream queries.
- Ensure cron/block-interval processing is monotonic and idempotent under reorg/restart conditions.
- Review dynamic event-source registration for bounded growth and duplicate protection.
- Verify API query paths fail safely and do not expose partial-corruption states.

Output format:
- Findings ordered by severity (`high`, `medium`, `low`).
- For each finding include: `severity`, `file:line`, `issue`, `impact`, `recommended fix`.
- Include a short `Residual risk areas` section even if no findings are present.


Parallel-agent output:
- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
