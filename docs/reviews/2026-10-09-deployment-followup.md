# Amitoj website deployment notification — 9 October 2026

The revised writing on amitoj.co remained live after the failure notification.
The domain still served the successful release, and fresh checks matched all
60 public writing pages and their descriptions, checked 61 routes and 54 image
URLs, and confirmed that both June agenda URLs still require authentication.

The GitHub pushes for the writing and date fixes triggered two additional
production builds. Their logs show the hosted-build guard stopped them because
the public Git checkout lacks the privately retained June agenda and its
middleware. The complete-file releases had those files and succeeded. The
initial release check verified the live site but missed the duplicate Git
deployment path.

Automatic deployments from `main` are now disabled with the documented
`git.deploymentEnabled.main` setting in `vercel.json`. Public source changes
are still saved in Git; releases submit the complete source with retained
production-file references. Other branch settings and the hosted-build guard
are retained. The guard continues to prevent an incomplete release from
replacing the site or dropping the protected agenda's access controls.

Verification of the configuration change, Git push, and complete-file release
is recorded in the private deployment-follow-up receipt. The failed builds
remain historical records; no failure notifications were muted or deleted.

The configuration follows [Vercel's Git deployment documentation](https://vercel.com/docs/project-configuration/git-configuration).
