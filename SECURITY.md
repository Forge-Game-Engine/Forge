# Security policy

## Supported versions

Forge is below 1.0. Only the latest release gets security fixes.

## Reporting a vulnerability

Please don't open a public issue. Report it privately through
[GitHub's private vulnerability reporting](https://github.com/Forge-Game-Engine/Forge/security/advisories/new).
We'll reply as soon as we can and keep you updated while we fix it.

## Verifying a release

Every release after 0.27.1 is published from GitHub Actions with npm
provenance. In a project that depends on Forge, `npm audit signatures`
checks that the installed package was built from this repository.
