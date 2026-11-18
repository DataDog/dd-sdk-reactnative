# Pull Request Writing Guidelines

Follow these rules when you write or edit pull request titles and descriptions.

Two parts also apply outside PRs:
- Section 0 (public repository) applies to everything: commit messages, branch names, code comments, test fixtures and review replies.
- Sections 1 and 4 (writing style) apply to commit messages and review replies.

The rest is specific to PRs (title format, template, labels, QA). Commit messages follow the convention in `AGENTS.md`.

The goal is **concise, technical PR descriptions that are easy to review**. A reviewer should quickly understand what changed, why, how it works, and what needs attention.

## 0. This repository is public

Everything in a PR is public and permanent: the title, description, commits, branch name, review comments, code comments and test fixtures. Forks, caches and notification emails keep copies even after you edit or delete something.

**Never include:**

- **Customer information.** No customer or company names. No details that identify a customer (for example their app, domain or bundle ID). No customer data such as stack traces, logs, screenshots, view names, URLs, or user, session or view IDs from their apps.
- **Support references.** No support ticket or escalation numbers or links.
- **Secrets and identifiers.** No API keys, client tokens, RUM application IDs, org IDs or other credentials, even test or revoked ones.
- **Internal links.** No Slack, Confluence, Google Docs, internal Jira URLs, Datadog app links (dashboards, notebooks, monitors, CI), or internal GitLab and build URLs.
- **References to internal projects.** No private repositories, internal service names, codenames, incident numbers, unreleased products or roadmap details.

**Allowed:**

- Ticket IDs (for example `RUM-1234`) in the title, branch name, description and commits. Use the bare ID, not a link to the internal tracker.
- Public GitHub issues and PRs (`#1234`, or links to `github.com/DataDog/...` public repositories).
- Public documentation (`docs.datadoghq.com`).

**If a change comes from a customer report,** describe the problem in generic, technical terms and reproduce it with synthetic data.

Prefer:

> Global attributes set with `DdSdkReactNative.setAttributes` before initialization are missing from the first view.

Over:

> <Customer> reported in <support ticket> that attributes go missing in their checkout flow.

When you rewrite a description someone else wrote, remove any of the content above and tell the author what you removed.

## 1. Be direct and technical

- Use precise, concise language.
- Remove filler, unnecessary adjectives, rhetorical flourishes and conversational mannerisms.
- Prefer short, independent sentences over long sentences with many clauses.
- State facts, decisions and trade-offs directly.
- Use technical terms where they fit. Don't explain concepts the reviewers already know.
- Every sentence should carry useful information.
- Don't repeat information across sections.

**Optimize for clarity and information density, not length or polish.**

## 2. Write for reviewers

A PR description answers four questions:

1. **Why?** What problem does this solve? What was the previous behavior?
2. **What?** What changed, and what is the new behavior?
3. **How?** Which implementation details or technical decisions matter?
4. **How to verify?** Which tests were added or run? What should reviewers check?

Include the information that helps reviewers understand and evaluate the change:

- Explain the motivation before the implementation.
- Describe behavior changes rather than listing modified files.
- Highlight non-obvious implementation decisions and their rationale.
- Make important constraints, assumptions and trade-offs explicit.
- Separate intentional behavior changes from refactors.
- Don't narrate the development process or describe trivial code changes.
- Leave out implementation details that are obvious from the diff, unless they explain an important decision.

## 3. Optimize for scanning

- Use short paragraphs, descriptive headings and focused bullet points.
- Avoid walls of text.
- **Bold important behavior changes, risks, limitations and decisions.**
- Use tables when they make comparisons easier to read.
- Use code snippets only when they clarify behavior or an important technical detail.
- Group related changes under meaningful subsections.
- Don't over-format. If everything is highlighted, nothing stands out.
- Put the most important information first.

A reviewer should understand the purpose and impact of the PR from the title, the summary and the highlighted points.

## 4. Prefer simple sentences and natural writing

- Express one idea per sentence where you can.
- Split long sentences that contain several independent points.
- Avoid elaborate transitions and overly polished prose.
- Don't write generic introductions or conclusions.
- Avoid AI writing patterns such as:
  - "It's important to note that..."
  - "This approach ensures..."
  - "By leveraging..."
  - "In order to..."
  - "This change enhances..."
  - "Let's dive into..."
- Avoid vague adjectives such as "robust", "seamless", "comprehensive" and "powerful".
- Prefer concrete statements to abstract descriptions.

**Write like an engineer explaining a change to another engineer.**

## 5. Explain behavior, not just code

- Describe the previous behavior when the reader needs it to understand the change.
- Explain the new behavior and how it differs.
- Include the technical mechanism only when it helps understand or review the implementation.
- Highlight edge cases, fallback behavior and failure handling.
- Explain why you chose an approach when the reason isn't obvious.
- Use concrete examples for surprising or complex behavior.
- Don't turn the description into a file-by-file changelog.

Prefer:

> `DdRum.addAction` called before `DatadogProvider` finishes initializing is now buffered and sent after initialization, instead of being dropped.

Over:

> Updated `DdRum` and the buffer implementation to add handling for actions during initialization.

## 6. Be precise about scope and impact

- Name the packages, platforms (iOS, Android, or both) and architectures (old, new, or both) that are affected.
- Call out behavior changes that customers can see.
- Highlight compatibility concerns, regressions and intentional limitations. This includes public API changes, `expo-datadog` compatibility and minimum React Native, iOS or Android versions.
- Mention native SDK version bumps, new dependencies and configuration options.
- Explain the impact on existing data or on events that were already sent, when relevant.
- Say when behavior is intentionally unchanged.
- Don't claim a change is risk-free.

Add a dedicated **Blast Radius** section only when the scope, risks or rollout warrant one.

## 7. Make testing actionable

- Include the commands to run the relevant automated tests (for example `yarn jest packages/core/src/rum/__tests__/DdRum.test.ts`).
- Summarize the important test coverage without listing every assertion.
- Give concrete manual QA steps when they help, including platform and architecture.
- State expected outcomes, not just actions.
- Separate verification that is done from verification that is pending.
- Never claim tests passed or manual QA was done unless you confirmed it.
- Use checkboxes when they help track verification.

Prefer:

> On iOS (new architecture), call `DdRum.addAction` before initialization completes. Verify the action shows up in the first view's RUM events after initialization.

Over:

> Test actions before init.

## 8. Use a consistent structure

**Title:** `[<JIRA-KEY>] <type>: <summary>`, or `[NOJIRA] <type>: <summary>` when there is no ticket. Examples of `<type>`: `feat`, `fix`, `chore`, `docs`. Release PRs use `[RELEASE] React Native SDK vX.Y.Z`.

**Description:** use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`) and fill its sections like this:

| Template section | Content |
|---|---|
| **What does this PR do?** | **Summary:** the problem and the change in a few sentences, with the most important behavior change first. Then **Changes:** grouped by behavior or technical concern, with the important decisions explained. |
| **Motivation** | Why the change is needed: the previous behavior, the ticket ID, and a link to the public GitHub issue if there is one. |
| **Additional Notes** | **QA:** test commands, coverage, manual steps, and what is verified or not yet verified. **Blast Radius** (only when warranted): affected areas, risks, rollout considerations. **References** (only when useful): ticket IDs, public issues, dependency PRs. |
| **Review checklist** | Leave it for the reviewers. |

**Labels:** add the `flags` label to every PR that touches feature flags, including PRs where flags are only part of the change. That means any change to:

- `packages/core/src/flags/`
- `packages/react-native-openfeature/`
- `packages/core/src/specs/NativeDdFlags.ts`
- native `DdFlags*` files in `packages/core/ios/` or `packages/core/android/`
- `example/src/flags/` or `example-new-architecture/flags/`

**Don't force every PR into the full structure.** A small change gets a short description. A complex change gets enough detail for a meaningful review. Leave out sections that would be empty.

## 9. Avoid unnecessary content

- Don't repeat the title in the summary.
- Don't explain obvious changes at length.
- Don't list every changed file unless file locations matter.
- Don't include generic benefits or speculative claims.
- Don't add filler to make the PR look substantial.
- Don't repeat implementation details in the Blast Radius section.
- Don't add a generic conclusion.
- Don't invent test results, issue links, performance measurements or implementation details.
- Keep the technical nuance when you simplify.

## 10. Output format

- Write valid GitHub Flavored Markdown.
- Use a four-backtick outer fence when the description contains triple-backtick code blocks.
- Keep the title separate from the description unless asked otherwise.
- Keep exact identifiers, file paths, commands, configuration options and ticket keys as they are.
- Don't invent URLs or add placeholders that look like real links.
- Don't add commentary before or after the description unless needed.

## Final review

Before you produce a PR description, check that:

- **It contains no customer information, secrets, internal links or references to internal projects (section 0).**
- The summary immediately explains the problem and the change.
- The previous and new behavior are clear.
- Important technical decisions are explained without unnecessary detail.
- The description is easy to scan.
- Key changes, risks and limitations stand out.
- Testing instructions are concrete and accurate.
- No unverified claim is presented as fact.
- No important information from the original description was lost.
- Redundant sentences, filler and AI mannerisms are gone.
- The length matches the complexity of the change.

**Default principle:** a PR description is a tool for code review, not a full implementation report. Make it easy to see what changed, why it matters and where reviewers should focus.
