#!/usr/bin/env bash
name_prefix="cobuild-indexer-chatgpt-audit"
include_tests=0
include_docs=1
preset_dir="scripts/chatgpt-review-presets"
package_script="scripts/package-audit-context.sh"

review_gpt_register_dir_preset "security" "security-audit.md" \
  "Focused security review of chain scope, provenance, and query exposure." \
  "security-audit" \
  "audit-security"
review_gpt_register_dir_preset "simplify" "complexity-simplification.md" \
  "Behavior-preserving simplification opportunities for the indexer." \
  "complexity" \
  "complexity-simplification"
review_gpt_register_dir_preset "bad-code" "bad-code-quality.md" \
  "Code-quality and indexing anti-pattern pass." \
  "anti-patterns" \
  "antipatterns" \
  "bad-practices" \
  "anti-patterns-and-bad-practices" \
  "code-quality" \
  "bad-code-quality"
review_gpt_register_dir_preset "reliability" "reliability.md" \
  "Replay safety, resilience, and operational reliability." \
  "reliability-audit"
review_gpt_register_dir_preset "test-gaps" "test-gaps.md" \
  "Highest-risk missing indexer tests." \
  "coverage" \
  "coverage-gaps"
