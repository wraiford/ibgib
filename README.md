# ibgib

This monorepo holds multiple projects building up a web3 DLT protocol for
distributed, decentralized and inevitably sovereign computation.

I'm in flux right now, as I've been developing this for nigh on two decades, but
in its current TypeScript incarnation, ibgib now comprises three main projects:

1. ts-gib
2. ionic-gib
3. keystone-gib

## [ts-gib](https://gitlab.com/ibgib/ts-gib)

Currently hosted on GitLab, ts-gib is the base lib with low-level primitives for
creating the ibgib DLT graphing substrate. Check out its
[README.md](https://gitlab.com/ibgib/ts-gib/-/blob/master/README.md) for further
info.

## [ionic-gib](./ionic-gib)

The primary MVP frontend dapp for ibgib, ionic-gib is an Ionic project, with
Capacitor & Angular, which targets:

1. SPA web page
2. Android app
3. iOS app
4. FireFox add-on
5. Chrome extension (and other chromium-based browsers)

## [keystone-gib](./keystone-gib)

_NOTE: ATOW, this project is NOT directly used but is slowly being assimilated into ionic-gib. Once the overall architecture is more fully implemented, I expect to pull keystone-related code back out and into its own lib. I keep this around to pick from, as well as for documentation, as the core concepts have not changed._

Keystones are meant to provide an "on-chain" identity mechanism used in
authentication & authorization for humans and non-humans alike, in a
decentralized environment. This is made possible through ibgib's unique DLT
which focuses is on-chain semantic versioning, i.e., cryptographically
reinforced timelines of anything - text, pictures, compositions, collaborations,
etc. Most existing approaches involve a certificate check, which is logged
out-of-band. In contrast, keystones enable on-chain and auditable identity
authentication sigma protocol transcripts using the same Merkle DAG substrate as
the data itself, but without unnecessary additional code complexity cost.

Check out the [keystone-gib README](./keystone-gib/README.md) for more details.

