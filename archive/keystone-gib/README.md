# being picked clean...

This low-level project is being slowly subsumed by the ionic-gib app project
while being actively developed. This act of recoupling is to increase the
iteration speed (since it's just me doing the development), since this is a
completely new paradigm. The ideas of keystones and on-chain challenge
mechanisms are still entirely valid though.

ATOW, I have incorporated and improved the basic witness and repo code from this
project, but I have not gotten to the keystone-related authentication part yet.
It is acting upon an anonymous, access-is-authorization model for simplicity.
Once I have that up and going, I am going to return to pecking from this project
until I have the keystones fully integrated, at which time I will then pull the
keystone layer back out into its own library as seems appropriate at that time.

## some notes on differences with current implementation 

_NOTE: I include this before the main material to give you proper context. You should probably skip/skim this section before reading the rest and then come back once you have finished._

I'm just looking through this readme and I'm thinking of changes I've made
and the current state actually running in code.

* Spaces as opposed to nodes.
  * Interestingly, thinking of a space is much like thinking of a node.
  * I'm still toying around with how this affects the paradigm.
  * Coordinating and sharing data among nodes is now like projections
    in spaces.
  * Currently when you "publish to the cloud", you add a sync(hronization)
    space and connect it with the local space.
    * atow these are built on top of space base classes that descends from witness.
      * the sync space is an AWS DynamoDB + S3 substrate adapter.
      * the local space is an Ionic storage substrate adapter.
      * the app itself acts as an interface for interacting with these
        spaces, basically becoming itself a metaspace.
      * all of these things are similar to thinking of nodes, but the space
        paradigm seems to be more appropriate. Molecules, matter, the universe,
        they are all mostly space right?
* Stone is not explicitly structured.
  * Data-only ibgib are just the JS objects.
* Witness code is cleaned up.
  * Still one thin layer of behavior on top of data, adding `witness` function.
    * This makes a witness largely an on-chain function analog itself.
  * All on-chain parameters of how the witness operate are still in the `data`
    map, with anything exposed on the classes themselves as needed per use case.
  * Because acts as a single point of interaction, I'm using this with the
    command pattern, so all `canGet` type of functions are encoded in 
    TOptionsInData/Rel8ns/IbGib.
    * e.g. `{ cmd: 'get', cmdModifiers: ['can'] ...}`

# ts-keystone

Keystone is the identity framework built on the ibGib protocol.  The ts is for
TypeScript, so this uses the ts-gib lib.

This README document will serve as the initial whitepaper for the keystone
architecture. Though, fair warning, I'm writing this before my typescript
implementation and it's been awhile since I first implemented it years ago.
Details may change and get out of sync with actual implementation! (That's
rather the point of the protocol anyway: to better coordinate versions of
metadata like this with the data it is supposed to describe.)

Another good thing to read is the documentation for the interfaces/types/etc.
in `types.ts`. That will be slightly more up-to-date more than likely.

## about

IbGib is a data protocol that builds on top of a DLT substrate (Merkle DAG), but
changes over time. So individual ibgibs are each like their own timeline, each
like a git repo. Each and every one of them can be forked, and if also producing
dna, they can be merged into other timelines.  Because they relate to each other
(via `rel8ns`) with Merkle links, each one is like its own little blockchain
when viewed as nodes on the DAG.  But because of specific special `rel8ns` like
`ancestor` and `past`, the ibgibs also have cyclic and non-directed properties.
So it's also NOT a DAG, and this is one aspect that is unique to the DLT
protocol.

The keystones leverage this unique architecture to provide a mechanism for
self-sovereign identity, authentication, authorization and the corresponding
validation rules for acting upon the core ibgibs. And it does this such that the
_process_ of identity, authentication, etc., is contained _in the same DAG as
the data with which it interacts._ So were you to see some data records, you
would not have to check a separate logging/audit trail to see the identity/path
of that data, since it's right there next to the data in the same base DLT
semi-structure.

## security related: lamport, ots, winternitz, etc.

The architecture includes properties quite similar to existing mechanisms
including Lamport signatures, One-Time Signatures (OTS), Winternitz OTSs, and
other hash-based signature protocols. It (V1) utilizes a zero-knowledge proof
challenge mechanism that reveals answers to problem set(s) (see further for an
example of a zero knowledge challenge cycle).

The "key" difference with keystones, however, is that the data architecture
itself is already an expanding Merkle DAG. So instead of the micro-optimizations
that implementations of these can provide in terms of single-node performance,
the ibgib protocol enables macro-level optimization for n-node scalability.

In two words: simplicity & reusability.

The maintainenance is easier, because the code base for generating data is the
same code base that is driving the keystone identity mechanism. Many tools
created for analyzing regular data/code can also be reused (DRY) for the
identity mechanism.

Also, the requirements/configurations of the challenge requirements can be
included "on-chain" in the keystones themselves. So instead, e.g., of
hard-coding in a siloed source code repository that 4 witnesses must sign in a
cluster with a quorum of a minimum of 8 out of 12 in order to allow a mutation
of a given data record (ibgib), you can have this already on chain and linked to
that ibgib via its authorization rules.  Now when you go to communicate these
rules (metadata), you leverage the same security mechanisms that the data itself
has in the same, consistent way (DRY). Consequently, this applies to altering
those the on-chain authorization rules as well.

_NOTE: In advanced use cases, you can actually use other protocols/mechanisms as well, and any other challenge mechanism like certs, and simply track the metadata in the keystone DAGs. But the challenges in v1 are strictly on-chain hash-based challenges._

### zero knowledge proof challenges

There are two main use cases for the keystones:

1) mutating an ibGib data record which contains authorization requirements on a
single node, attempting a "single source of truth".
2) exchanging and witnessing ibGibs among (possibly remote) witness nodes,
leading to a continuous stream of beliefs.

_NOTE: Really no. 2 is a corollary to the no. 1, but it is remarkable enough to list it explicitly._

_ALSO NOTE: Just like the terrifically heuristic laws of thermodynamics, a "single source of truth" is as possible as an isolated system. Given results in quantum physics, I'll leave it up to you whether you believe this is possible._

#### case no.1 : mutating an ibgib on a single node

At the beginning of a mutation of an ibgib, intrinsically via its `data` or
extrinsically its `rel8ns`, that ibGib may have associated authorization rules
that it wishes to be followed.
_(It is always assumed that bad actors can create derivative data in bad faith, but that will be addressed)._

##### example - mutating A1 to A2

A simple example is that only a certain set of identities can perform a `mut8`
transform on the ibgib:

We want to transform `A1` to `A2` by adding something to its internal data:

_NOTE: In the following pseudo code, I will use 3letters3numbers to denote a sha256 hash, e.g. `AAA111` (pretend it's 64 characters long), and will try my best to be unique per instance. In other cases of variables placeholders I will use square brackets [] at the first level, and curly brackets {} if inside of the square brackets. These are just placeholders though, not values. So [scope] would turn into just "transform" e.g. if the scope is all transforms, or just "mut8" if the scope is a mut8 transform. It is NOT "[scope=mut8]" with a name=value syntax._

_NOTE: The basics of the ibGib data structure are that the `ib` is for metadata, the `data` and `rel8ns` are locally-intrinsic and extrinsic state, and the `gib` is the cryptographic hash of the three previous fields. the `ib^gib` is the address format that is stored in `rel8ns` property (not just the `gib` hash!) and uniquely content addresses the record as a node in a Merkle DAG substrate. See ts-gib for more details._

`A1`:

```json
{
    "ib": "A",
    "gib": "ABC123", // the hash of the other fields, see ts-gib for inf
    "data": {
        "x": 0,
    },
    "rel8ns": {
        "past": [],
        "keystone": ["keystone [scope={transform}] [keystoneTjpGib]^XYZ321"],
    }
}
```

We want to get to `A2`:

```json
{
    "ib": "A",
    "gib": "DEF456", // different hash of the other fields
    "data": {
        "x": 10000000, // changed data
    },
    "rel8ns": {
        "past": ["A^ABC123"], // this would be the pointer to A1
        "keystone": ["keystone [scope={transform}] [keystoneTjpGib]^XYZ321"],
    }
}
```

_NOTE: We're going to be ignoring the dna, but it would be included in the dependency graph, and specifically in the `A2` rel8ns object. Dna though does not have its own keystone, i.e. dna has no "owner" or any similar thing. This is necessary for applying dna in n-dimensional identity spaces._

A good faith keystone implementation would check the authorization rules located
in the "keystone [scope={transform}] [keystoneTjpGib]^XYZ321" which could look
something like this:

```json
{
    //     keystone [scope={transform}] [keystoneTjpGib]
    //     note that QQQ123 is in the first position in the `past` rel8n (tjp).
    "ib": "keystone mut8 QQQ123",
    "gib": "XYZ321",
    /** intrinsic data */
    "data": {
        "expirationFormat": "UTC", // v1 is UTC only
        "expiration": "Mon, 01 Jan 4321 12:34:56 GMT",
        "challenges": {
            // challengeSalt: challengeResult (hash)
            // order doesn't matter, the size (number of) is determined by config.
            "AAABBBCCC": "AAA111",
            "DDDEEEFFF": "BBB222",
        },
        /** previous stone's (last entry in past) solutions. Empty at first. */
        "solutions": {
            // challengeSalt: [challengeResult, challengeSecret, ]
            // "AAABBBCCC": ["AAA111", "SEC123"],
            // "DDDEEEFFF": ["BBB222", "RET456"],
            // challengeSecret doesn't have to be a sha256 hash, but is in v1
        },
    },
    /** extrinsic data */
    "rel8ns": {
        // note that the gib of the tjp (QQQ123) is in the ib value of this and
        // all future frames for this ibGib timeline.
        "past": ["keystone mut8 undefined^QQQ123"],
        //          keystone [scope] [keystoneTjpGib]^ZZZ111
        "meta": [
            /** metadata about this keystone */
            "keystone config^ZZZ111",
        ],
        "keystone": [
            /** similar to "recover password", to be discussed later in this paper */
            "keystone recover [keystoneTjpGib]^YYY444",
            /**
            * Alternative to the data key, you can also relate the
            * revocation Keystone that invalidates this keystone.
            * If the invalidate keystone is mutated, i.e. its (difficult) challenges
            * are solved, then this indicates that a keystone with the "invalidate"
            * rel8n to it is invalid.
            * Time will tell whether it's better in `data` or in `rel8ns`.
            */
            "keystone revoke [keystoneTjpGib]^XXX555"
        ],
    }
}
```
and it's corresponding config:

```json
{
    "ib": "keystone config",
    "gib": "ZZZ111",
    "data": {
        "version": "v1",             // config shape version
        "challenges": {
            "type": "hash",
            // general challenge options
            /** solve at least this many challenges to pass */
            "minChallengesRequired": 1,
            /** solve at most this many challenges to pass */
            "maxChallengesRequired": 2,

            // challenge options specific to, e.g., hash challenges
            /** implied in v1 is sha256 */
            "minChallengeSaltSize": 64,
            "maxChallengeSaltSize": 64,
            /**
             * Number of recursive iterations to perform on the
             * challengeSalt + challengeSecret
             */
            "hashIterations": 5,
            /** Optional right now. V1 only implemented algorithm is SHA-256. */
            "algo": "SHA-256",

            // ... also other config options in the future, these
            // will vary as more types of challenges are created.
        },
        /**
         * How might the node get the challengeSecret from its keySecret.
         * This does NOT have to be implemented consistently. A node is
         * responsible for its own ability to take a challengeSalt and get
         * the secret.
         */
        "suggestedChallengeSecretMethod": {
            /** Number of hash iterations when generating challengeSalt. */
            "hash": 5
        },
    },
    "rel8ns": {
        "past": [],
        // these are examples for future cases of storing additional (metadata) versioning
        // information on chain. To be implemented when VCS is, as this will make it
        // much easier to generate. For now, these will be implied through their absence.
        // "core-versions": ["meta version core 0.1.2^QQQ000"],
        // "keystone-versions": ["meta version keystone 0.1.2^UUU444"],
    }
}
```
These offer close to a simplest case example, showing the basic challenge
structure and how this information can be stored "on chain" alongside the
challenges themselves.

**In general, metadata sits alongside the data in all of the ibGib data, which is a fundamental benefit of the architecture.**

##### keystone ib with tjp

_Marty McFly: That’s right, Doc. November 12, 1955. Doc: Unbelievable, that old Biff could have chosen that particular date. It could mean that that point in time inherently contains some sort of cosmic significance. Almost as if it were the temporal junction point for the entire space-time continuum. On the other hand, it could just be an amazing coincidence. From IMDB._

A Temporal Junction Point (tjp) is like a checkpoint for a timeline, like its
"birthday".  it acts essentially as that ibgib's unique "name". We can think of
it as the first entry in its `past` rel8n that is unique. We can reference this
tjp when, e.g., we sign up to a bus looking for updates to an ibgib. We don't
want to say give me the updates for some intermediate one, because the bus would
have to search through the ibgib's entire history. With the tjp, we can always
get an immediate handle on the entire timeline. That the tjp's use is essential
cannot be overstated!

And including the tjp in the keystone's ib is extremely important, and so in
generating keystones we must first `mut8` its `ib` to include it _after_ its
original "birthday" fork. Once we have done this, now we can start using the
keystone in relating to other ibgibs.

_NOTE: We can't include it before it's birthday fork because of the chicken/egg dilemma with the progression of time._

##### generating challenges & validating solutions

The `challenges` has a `mut8` section, with a list of hashing challenges.  The
corresponding keystone config contains metadata about the requirements for those
challenges. So in this case, at least/most `min/maxChallengesRequired` entries
in the `mut8` section must be solved in order to perform the `mut8` operation on
an ibgib. An entry is "solved" with a `challengeSecret`, such that in
generating/ validating an entry:

```javascript

let out: string = "";
for (let i = 1; i<= hashIterations; i++) {
    out = hash(challengeSecret + challengeSalt + a + b + out);
}
challengeResult = out;           // if generating the challenge entry
                                 // or..
assert(out === challengeResult); // if validating challengeSecret

```

But how do we generate the challengeSecret itself in the first place?

Well, a single keystone has an implied single secret, call it `keySecret`.  The
`challengeSecret` would be generated off of this `keySecret` in whatever manner
the implementer wants. For keystone-gib v1, the algorithm is based on the
`suggestedSaltGenMethod` value `hashn` where n is recursive hashes:

```javascript

let challengeSecret: string = "";
for (let i = 1; i <= n; i++) {
    challengeSecret = hash(keySecret + challengeSalt + challengeSecret);
}

```

_NOTE: you can have more than one secret per keystone, just like you are responsible for being able to map from the `challengeSalt` to the `challengeSecret`. But this would largely defeat the purpose, as the secret to the keystone would actually be conceptualized as "both" secrets concatenated and the mapping would know how to index into it per challenge._

The important thing is that the node that generates the keystone, and all nodes
that will mut8 the stone, know how to produce the `challengeSecret`. This could
be from direct user input. It could be based on a whole lot of things. But the
mechanism needs to be consistent from the `suggestedSaltGenMethod`.

**For this reason, it's very important to choose a strong method of generation that shields the node's `keySecret` for as long as possible.**

Once a node's `keySecret` is exposed, its entire future (and some percentage of
its past) becomes potentially invalid, so it's important for witnesses
(discussed later in this document) to witness and document this invalidation! So
you wouldn't want just one hash to separate the generated `challengeSalt` from
the `keySecret`. Depending on the use case and scope of the keystone, it may be
generating _thousands_ (or more!) of challenges.

##### notes on keystone metadata (config)

The `min/maxChallengesRequired` and `hashIterations` are examples of
configuration options, where you can choose the qualities of the challenges.
This can vary depending on use case. For example, low security probably only
would require one iteration, with one min/max required. While higher security
environments may involve more challenges. But remember, you can also associate
multiple keystone to the ibgibs, so just increasing the difficulty of one
keystone may not be needed or desired. It may be better to add an additional
keystone, possibly owned by a different witness, like having multiple physically
separate keys on a submarine.

##### bad actors...

Obviously, bad actors could do things here to attempt to rewrite history. If
there are enough challenges gathered, it could be attempted to hijack a timeline
via a replay attack or some other vector. This is why multiple witness nodes are
important, and the importance of the number of witnesses is directly related to
the importance of the integrity of the data.

Which brings us to...

#### case no. 2: exchanging ibgibs among multiple witness nodes

Internally, i.e. intranodally (on a single node), the application of this
mechanism may be curioiusly interesting but not necessarily exciting...But
that's why we'll discuss inter-nodal communication among many participants in a
distributed system, i.e., **witnesses and consensus**.

When exchanging ibgibs among multiple witness nodes, the entire workflow is
encapsulated in exchanges of ibgibs, their metadata (which are also ibgibs), and
the accompanied dependencies, all in a single DAG, a **projection inevitably
encapsulated in a single ibgib**.

There is no out-of-band complexity required, such as authenticating via a
certificate/PKI, the trail of which gets stored in another silo(s) (probably one
or more log files).  This is because the ibgib DAGs themselves act as the PKI,
and checking with, e.g., a CA authority is simply the same exchange of ibgibs
with a witness we trust enough to call an authority.

Though this of course does not preclude the use of leveraging these out-of-band
mechanisms, nor does it imply only a single channel among witnesses. Indeed,
_multiple channels of communicating is highly encouraged_ for verification of
`gib` hashes and challenges, to fight against all sorts of nasty things like
replay attacks and other forgeries.

In the end though, you have multiple witnesses with the same ibgibs stored
locally to whatever extent their function (in the workflow) requires. These
ibgibs are internally verifiable, to multiple extents depending on what you're
verifying.  The bonus is that the witness node could (should) also be able to
explain _how_ it came to receive the nodes and of course in the same consistent
data structure.

**Because of this, witnesses can even share this metadata of previous exchanges 
as the payloads in future exchanges with other witnesses**, again to whatever
extent is required per use case.

_NOTE: this says nothing about encryption. The level of temporary opacity is entirely up to participants._

So the same infrastructure that is created to navigate/analyze data at the
protocol level can be used on the data used in transmissions.

##### keystone exchange v1 goal

In the first intranodal example for allowing a `mut8`, the config described the
requirements for the authorization of that ibgib alone. When exchanging ibgibs
among nodes, there are of course requirements stored in the same way. But the
problem is slightly different, because there is the possibility for adversarial
participants.

_NOTE: In the case of intranodal authorization with your own node being compromised, then **you** are the adversarial participant so this is encapsulated in the internodal case._

So let's be more concrete on the goal. We're going to be exchanging `A1`, `A2`,
their associated keystones, dna, and any other ibgibs in their dependency graph, between
two nodes, `N1` and `N2`.

_NOTE: This can actually be considered simply `A2` and its dependency graph._

To start with a minimal case (v1), we will have the following ibgibs.

A transmission request ibgib (`tx`) sent from `N1`:

```json
{
    "ib": "tx start [TXUUID]",
    "gib": "UHM314",
    "data": {
        "ibgibs": [
            "A^ABC123",
            "A^DEF456",
            // other dependency addresses. It is a finite list.
        ],
        /** If including dna */
        "dnas": [
            "fork^",
            // ...
        ],
        "keystones": [
            "keystone [scope={tx.UUID}] [keystoneTjpGib]^XYZ321",
            // other keystones
        ],
    },
    "rel8ns": {
        "past": [],
        "keystone": ["keystone [scope={tx.UUID}] [keystoneTjpGib]^XYZ321"],
        /** v1 will use default config, i.e., the following is not needed. */
        // "config": ["txrx config^REW987" ],
    }
}
```

So we include the following metadata in the `ib`:

* `tx`
  * indicates its a transmission
  * this is opposed to a reception (`rx`)
* `start`
  * it's the start of a new transmission.
* `[txUUID]`
  * unique identifier to reference the entire exchange transaction.

We separate the ibgibs to send as an easy optimization into the following groups:
`ibgibs`, `dnas` and `keystones`. Other categorizations can be used for optimization per
use case.

Note the keystones in the `data` are in the payload's dependency graph and the
keystone(s) in the `rel8ns` is for authentication for _this_ exchange. When two nodes
are first handshaking for the first time, they should create scoped keystones off of
the keystones they use for universal identification (i.e. "registered" with other
authorized/trusted witnesses). These scoped keystones should only be used with
communication between those two nodes. This is analogous to how current browsers
work with establishing a connection via an asymmetric key and then create
a fast and temporary symmetric key between just the two of them.

A response reception ibgib (`rx`) from `N2`:

```json
{
    "ib": "rx [TXUUID]",
    "gib": "UHM314",
    "data": {
        /**
         * This is in data and not rel8ns, in case it is malformed/malicious/etc.
         * This allows optional metadata without a valid transaction.
         * Though to combat DoS types of attacks, what inevitably happens with this
         * metadata is up to the node.
         */
        "tx": "tx start [TXUUID]^UHM314",
        /**
         * Continue options: (v1 naive optimization)
         *   all: send all ibgibs, node has 0%
         *   none: send no ibgibs, node has 100%
         *   exclude: send all ibgibs except those excluded, node has less than 50%
         *   include: send only these ibgibs, node already has more than 50%
         *   false: do not continue, error/other
         */
        "continue": "all",
        "include": [
            "A^ABC123",
            "A^DEF456",
            "keystone [scope={tx_UUID}] [keystoneTjpGib]^XYZ321",
        ],
        "exclude": [ ],
        /** Example errors object */
        "errors": {
            "keystone": "invalid/expired/revoked",
            "tx": "invalid hash/invalid uuid/uuid already started/etc.",
        },
    },
    "rel8ns": {
        "past": [],
        "keystone": ["keystone [scope={tx_UUID}] [keystoneTjpGib]^XYZ321"],
    }
}
```

This shows multiple response possibilities via the `continue` key. The options
`"all"`, `"none"`, `"exclude"` and `"include"` all are values that will continue
the exchange.

The `"none"` value means that no intermediate ibgibs need to be transmitted, but
the exchange can complete. The `false` value immediately stops the transaction.

The other values are naive, but useful, v1 optimizations that state which ibgibs
need to be transmitted.

During the transmission process, which is "simply" sending json objects with
ack responses (batching not implemented in v1). At any point, the sender can
ask for which ibgibs are still required via an info request:

```json
{
    "ib": "tx info [TXUUID]",
    "gib": "POE447",
    "data": {
        "ask": "update",
    },
    "rel8ns": {
        "past": [],
        "keystone": ["keystone [scope={tx_UUID}] [keystoneTjpGib]^IJK432"],
        /** v1 will use default config, i.e., the following is not needed. */
        // "config": ["txrx config^REW987" ],
    }
}
```

_NOTE: There is no need for any dna for the transmission/reception metadata, since an exchange should not ever (most likely) need to be reapplied to a different timeline._

##### keystone exchange future optimizations

Because data is widely content addressed via hashes, optimizations abound.

Say your node doesn't have all of the ibgibs in the transaction.  But you're not
really interested in _all_ of the ibgibs, only some subset.  This is especially
common when considering, e.g., dna ibgibs.  But for your use case, you want to
be a trusted node and still want to have a verifiable exchange. What are your
options?

Well just as you inevitably will trust some subset of witnesses to varying degrees,
so too will you trust some for these types of scenarios. If someone you trust has
indeed received some subset of the transaction, you can temporarily simply rely
on that node's trust level to some degree. There are also of course random sampling
where you can "love your neighbor" but still "brand your cattle" and other strategies
for checking up on them. But it still comes down to trusting their hashes and
the number of witnesses for corroboration. So if you just trust N123, then you're
putting a lot of power in the hands of one node. But if 5 other nodes corroborate then
you are much more likely to have correct information. There are of course other analyses
possible among the nodes to trust, etc. And also this strategy of trust can itself
be included in your metadata DAG "on-chain" like all of the other transaction metadata.

## contributing

Wat? Contribute? hmm. Love it, wouldn't believe it if you told me you wanted to. But
you can still it do.

### to add unit tests (specs)

Add a file in the same folder as the one you want to test.
Copy the filename and add .spec just before the extension,
e.g. src/folder/file-here.ts -> src/folder/file-here.spec.ts

## questions

1. Do you want to finally be able to answer if a tree falls in the forest and no one is around to hear it, does it make a sound?
2. I'm just typing here to test out this environment. There is an available update though. Does that count as a question?
3. Is this section for others questions, or instructions on what to do if you have questions? hmm...


The quick brown fox jumped over the lazy dogs.

# the quick brown fox jumped over the lazy dogs.

the quick brown fox brown fox brown fox fox fox fox fox fox fox fox fox fox
the the the
quick quick quick quick quick quick
brown brown brown brown brown brown brown brown brown brown brown brown
fox fox fox fox fox fox fox fox fox fox fox
jumped jumped jumped jumped jumped jumped jumped jumpedjumped jumped jumped
over over over over over over over over over
the the the the the the the the the the the the the the the the the the the the the
lazy lazy lazy lazy lazy lazy lazy lazy lazy lazy lazy lazy lazy lazy lazy lazy lazy
dogs dogs dogs dogs. dogs. dogs. dogs. dogs. dogs. dogs. dogs. dogs. dogs. dogs.

The quick brown fox jumped over the lazy dogs.
