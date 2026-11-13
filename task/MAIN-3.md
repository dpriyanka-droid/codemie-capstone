# MAIN-3 — Add automated API tests and GitHub Actions CI for BookManagementApp

## Links
- **Jira:** https://priyankapri425.atlassian.net/browse/MAIN-3
- **Confluence (Architecture / HLD+LLD):** https://priyankapri425.atlassian.net/wiki/spaces/Main/pages/1605633/MAIN-3+-+Add+automated+API+tests+and+GitHub+Actions+CI+for+BookManagementApp+-+Architecture+HLD+LLD
- **HLD link:** https://priyankapri425.atlassian.net/wiki/spaces/Main/pages/1605633/MAIN-3+-+Add+automated+API+tests+and+GitHub+Actions+CI+for+BookManagementApp+-+Architecture+HLD+LLD
- **LLD link:** https://priyankapri425.atlassian.net/wiki/spaces/Main/pages/1605633/MAIN-3+-+Add+automated+API+tests+and+GitHub+Actions+CI+for+BookManagementApp+-+Architecture+HLD+LLD
- **PR link:** TBD

## Repo / Branches
- **Repository:** https://github.com/dpriyanka-droid/codemie-capstone
- **Source branch:** `MAIN-3`
- **Base branch:** TBD (expected: `main` — lowercase)

## Context
- PR creation attempt failed when using base branch `Main` (capital M): `422 Validation Failed` → `PullRequest.base invalid`.
- Repository appears to use default branch `main` (lowercase). Existing branches mentioned: `main`, `MAIN-1`, `MAIN-2`, `KAN-2`, `MAIN-3`.
- Current `MAIN-3` branch change: only a single trailing space added to `README.md` (committed).

## Open Questions / Needs Confirmation
1) Confirm PR base branch: use **`main`** (lowercase)?
2) Confirm scope constraint: are we allowed to add actual code changes (tests + GitHub Actions), or does the “single trailing space only” restriction still apply?

## Notes / Updates
- Confluence architecture page created in space **Main** with HLD/LLD sections, ADR-style decisions (base branch + test DB strategy), open questions, and links to existing HLD/LLD/Achievements pages.

## Checklist
- [ ] Confirm PR base branch
- [ ] Confirm scope constraint (code changes allowed)
- [ ] Create PR from `MAIN-3` → base branch
- [ ] Add pytest-based API tests
- [ ] Add GitHub Actions CI workflow
- [ ] Update documentation (README/Confluence) as needed
