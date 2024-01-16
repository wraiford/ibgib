import { IbGib_V1, IbGibData_V1, IbGibRel8ns_V1, sha256v1 } from "ts-gib/dist/V1";
import { IbGibAddr, Gib, Ib } from "ts-gib";
import { hash } from "ts-gib/dist/helper";
import { StoneData_V1, Stone_V1, StoneTransformOpts_Fork, CanTransformResult, StoneTransformOpts_Mut8, StoneTransformOpts_Rel8 } from "./stone";
import { UNDEFINED_IB } from "./constants";
import { CanResult } from "./types";

/**
 * We need to implement authorization rules engine that goes along with the keystone
 * mechanism.
 *
 * When a caller has an ibgib, that ibgib has an internal validation, i.e. if
 * its internal structure create a valid dependency graph.
 *
 * But the other question hinges on authorization: Has each step of the ibgib's
 * dependency graph been followed?
 *
 * For extremely large graphs, this is a very lengthy process, and there must
 * eventually be an optimization that allows for "stitching together" graphs
 * to some degree.
 *
 * ## workflow
 *
 * As soon as a payload ibgib has a 'keystone' relation, then that indicates that
 * that payload's changes must be accompanied by proofs of the given keystone.
 *
 * This can happen in two ways:
 *
 * 1) Both the keystone and payload change.
 * 2) Only the keystone changes
 *
 * ### 1) both keystone and payload change
 *
 * The keystone can be challenged and mutated before the operation, and
 * this mutation is propagated to the payload and included in the payload's
 * data, either via internal `data` (a mut8) or external `rel8ns` (a `rel8`).
 *
 * This workflow would be very difficult, as either the inclusion of the new keystone
 * (with its solved challenges) must occur in a single transaction along with the
 * payload's changes, or it must occur after the payload has changed - both
 * alternatives have extreme complications.
 *
 * The first would create extreme complexity in timing/coordination, as well as lose
 * the hashing guarantees provided by the `gib` field. And even this was solved
 * acceptably, it would still at best obscure that payload's changes.
 *
 * The second alternative seems little better, as it would create
 * an alternating timeline of payloads that had the updated keystone and those
 * that did not. This may end up being an acceptable structure, but effectively
 * this could just be an implementation of the "only" the keystone changing and
 * the payload being aware of the change. But I am dubious of this.
 *
 * ### 2) only the keystone changes
 *
 * If, however, only the keystone changes, then it becomes more of a witness to
 * the changes. It can have the guarantee of the `gib` hashing and thus check
 * the internal validity of the new payload to the extent of which its own use case
 * would determine.
 *
 * _NOTE: In the future, this would inevitably lead to the stone/identity/witness's own determination of its use case, analogous to the concept of free will, as the ability to validate exceeds the possible processing capacity. This is in line with ibgib's self-similarity conception of all "things" being living, i.e. Life Lives Life._
 *
 * So the mechanics would be:
 *   A. Payload changes per mut8/rel8 transform.
 *   B. Keystone(s), i.e., Witness(es), validate per _their own_ validation/authorization rules.
 *   C. Witnesses can intercommunicate for replication, but it is always mutating their own keystone which becomes, in effect, that keystone's identity space.
 *
 * This in turn mandates the use of a scheduler for delegating which witness gets to process.
 * In fact, this scheduler is in effect the processor, as it is essentially the proxy to the processor.
 * Behavior among payloads and witnesses (which themselves can be payloads) turns into an event-based system,
 * where one discrete time step of a payload, culminating in a new discrete payload datum, would only
 * then fire off the keystone's witnessing handler for that event.
 *
 * This in turn mandates the use of an event bus that orders the scheduling based on events.
 *
 * At some point, the scheduler's metadata cannot be captured within its own system,
 * otherwise it would screech to a halt as processing overhead grows exponentially each
 * time a new ibGib is added.
 *
 * ### schedulers, repos, buses as witnesses
 *
 * Any function can be seen as a witness that observes the args and reacts accordingly.
 * In FP, this includes producing a function result, as well as possible side effects.
 * OOP has the same concept via single-responsibility classes, whose ideal behavior only
 * does a "single" thing.
 *
 * A scheduler can be thought of a witness that observes "one" ibGib at a time ("one" just as
 * functional programming currying has only "one" argument at a time), and the result of which
 * affects queueing/dequeueing things that will be processed.
 *
 * Say we have an application that has a user who takes a pic. This pic is already conceived of
 * as a pic ibGib (with ancestor pic^gib), and we want to ascribe the user's keystones, including
 * his/her/its preferences as to what to do with the pic. This includes privacy settings, authorization
 * settings, and "where" to store the ibGib. Largely, this "where" to store the ibGib is the superset
 * that includes the first two things. If it is a private ibGib, then it would probably be stored "in"
 * the private space. If it is meant to be "posted online", i.e. shared with some other group of users,
 * then it would be stored "in" that identity space.
 *
 * These types of "where" would be where the address is linked to, and they would need access to
 * the ibGib record itself, i.e., a repo where the ibGib is replicated (storage can be thought of
 * as replicating from the local in-memory "repo" to storage repo(s)).
 *
 * So locally, we could have a scheduler that witnesses the address, with which it then replicates the
 * address in others' identity spaces in some sort of order per its internal state (including its queue(s),
 * queueing strategies, etc.). The repo would also witness the address, in which case it would persist it
 * if it doesn't know it already. Or possibly the put function of the repo is the witness, in which
 * case it would put it in its storage. Eesh.
 *
 * So back to the picture. We create an ibGib in memory, and we give it to the scheduler to witness.
 * One of the first things to schedule is the repo storage.
 *
 *
 */


// /**
//  * Info handle to an ibGib. Either it's in memory or it's (possibly) the information
//  * required to load it into memory.
//  */
// export interface IbGibInfo_V1 {
//         /**
//          * full ibGib payload
//          */
//         ibGib?: IbGib_V1;
//         /**
//          * Address of the ibGib, which may be used to reference it.
//          */
//         ibGibAddr?: IbGibAddr;
//         /**
//          * If given, these are repos in memory to check for the {@link ibGibAddr}.
//          *
//          * Not needed if providing the {@link ibGib} in memory.
//          */
//         repos?: IbGibRepo_V1[];
//         /**
//          * If given, repo addresses that may or may not mean anything
//          * to a receiver. It will be up to them to resolve these addresses
//          * to an actual repo object reference. This reference would then
//          * act the same as the {@link repos} property.
//          *
//          * Not needed if providing the {@link ibGib} in memory.
//          */
//         repoAddrs?: IbGibAddr[];
// }

/**
 * The relationship between witnesses and stones is similar to current conceptions
 * of code and data: A witness has behavior while simple stone data is used intrinsically.
 *
 * So whereas a {@link Stone_V1} is the runtime instantiation of an ibGib with
 * intrinsic quality, a witness is a coordinator of stones (and other witnesses as
 * a witness can itself be a stone, just as code can be data.)
 * 
 * It has one behavior added to stones: To witness other ibgibs.
 *
 * When it does this, it is responsible for any side effects that it like persisting
 * to a repo(s). However, there may still be other ibgibs who witness it
 * that may create side effects, e.g., persist it as well in *its* repo(s) of choice.
 *
 * It is a witness who is responsible for authorizing changes in stones in an
 * authorization environment/use case. A stone itself has no notion of permission.
 * 
 * Basically a witness is a function, and the ibgib it witnesses is the argument.
 */
export interface Witness_V1 extends IbGib_V1 {
    /**
     * This is the primary function that a witness ibgib can do.
     *
     * @param other ibgib to witness.
     */
    witness(opts: WitnessOpts): Promise<void>;
}
export interface WitnessOpts {
    other: IbGib_V1;
}
