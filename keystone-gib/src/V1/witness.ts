import { IbGib_V1, IbGibRepo_V1, IbGibData_V1, IbGibRel8ns_V1, sha256v1 } from "ts-gib/dist/V1";
import { IbGibAddr, Gib, Ib } from "ts-gib";
import { hash } from "ts-gib/dist/helper";
import { StoneData_V1, Stone_V1, StoneTransformOpts_Fork, CanTransformResult, StoneTransformOpts_Mut8, StoneTransformOpts_Rel8 } from "./stone";
import { UNDEFINED_IB } from "./constants";
import { CanResult } from "./types";

/**
 * We need to implement authorization rules engine that goes along with the keystone
 * mechanism.
 *
 * When a caller has an ibgib, that ibgib has an internal validation, i.e. does
 * its internal structure all create a valid dependency graph.
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
 * (observer/pubsub pattern). One of the first things to schedule is the repo storage.
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
 * of code and data: A witness has behavior while data is used intrinsically.
 *
 * So whereas a {@link Stone_V1} is the runtime instantiation of an ibGib with
 * intrinsic quality, a witness is a coordinator of stones (and other witnesses as
 * a witness can itself be a stone, just as code can be data.)
 *
 * It has one behavior: To witness other ibgibs.
 *
 * When it does this, it is responsible for any side effects that it like persisting
 * to a repo(s). However, there may still be other ibgibs who witness it
 * that may create side effects, e.g., persist it as well in *its* repo(s) of choice.
 *
 * It is a witness who is responsible for authorizing changes in stones in an
 * authorization environment/use case. A stone itself has no notion of permission.
 *
 * ## why
 *
 * It's hard for me to describe why I'm doing any of this. So I'll give one example
 * just from yesterday (July 27, 2020).
 *
 * There was a Black Lives Matter protest in Austin recently.
 * There was a driver who drove "into" or "in the direction of" protesters.
 * A protester was shot and killed. I read this on a New York Times article titled
 *   "Garrett Foster Brought His Gun To Austin Protests. Then He Was Shot Dead."
 *
 * It sounds awful and it is. But that's not my beef.
 *
 * The article has over 1300 words, including 13 words in the title. It's very long,
 * so many aren't going to read the entire article, so the title is even more
 * important. But Dude didn't just bring his "gun" though...he was carrying an AK-47.
 * But that's not my beef either.
 *
 * My beef is that the top FIFTY-FOUR articles on the topic on Google News did not
 * mention that dude had an AK-47 in the title. FIFTY-FOUR. That means that FIFTY-FOUR
 * writers didn't feel that the protester having an AK-47 was relevant enough
 * information to include in the title. FIFTY-FOUR.
 *
 * Some say "gun". Some say "armed". Some say he's pushing his quadriplegic girlfriend.
 * Many mention that it's Black Lives Matter, and thus implying that he was a peaceful
 * protester.
 *
 * Not a single one says "AK" or even "rifle"...NOT ONE. FIFTY FOUR ARTICLES.
 *
 * Something ain't right with the "news"...and twitter and others are just a service
 * layer. There isn't a direct-source news outlet that we can trust to provide
 * multiple views. Links are poor. The interface with our information is poor.
 * Http just ain't cuttin' it, and other vNext web technologies are stuck in
 * vPrev modalities.
 *
 * ibgib is about providing a more robust interaction interface to unite the digital
 * and analog worlds. Because this FIFTY-FOUR summary is only one example in a vast
 * sea of mis- and dis-information.
 *
 * I call this the Studio FIFTY-FOUR Rule. I had FIFTY-FOUR witnesses fail me here.
 *
 * FIFTY-FOUR worthless witnesses who were not friends.
 *
 * FIFTY-FOUR. Is this what this world is?
 *
 * Here is the full article:
 *
 * > The police in Austin, Texas, have not identified the motorist who fatally shot a protester after driving his car in the direction of marchers.
 * > One person was killed in a shooting at a Black Lives Matter protest in Austin, Texas, after a car drove into the crowd.
 * > By David Montgomery and Manny Fernandez
 * > July 26, 2020
 * > AUSTIN, Texas — It was not unusual for Garrett Foster to be at a protest against police brutality on a Saturday night. And it was not out of character for him to be armed as he marched.
 * > Mr. Foster was carrying an AK-47 rifle as he joined a Black Lives Matter demonstration blocks from the State Capitol in Austin, Texas. Gun-rights supporters on both the left and the right often carry rifles at protests in Texas, a state whose liberal gun laws allow it.
 * > Mr. Foster, wearing a black bandanna and a baseball cap, bumped into an independent journalist at the march on Saturday, and he spoke matter-of-factly about the weapon that was draped on a strap in front of him.
 * > “They don’t let us march in the streets anymore, so I got to practice some of our rights,” Mr. Foster told the journalist, Hiram Gilberto Garcia, who was broadcasting the interview live on Periscope. “If I use it against the cops, I’m dead,” he conceded.
 * > Later that night, Mr. Foster was fatally shot, but not by the police. The authorities said he was killed by a motorist who had a confrontation with protesters.
 * > The police and witnesses said the man in the car turned it aggressively toward the marchers, and Mr. Foster then approached it. The driver opened fire, shooting Mr. Foster three times. He was rushed to a hospital and was later pronounced dead.
 * > Austin’s police chief, Brian Manley, told reporters on Sunday that as the motorist turned, a crowd of protesters surrounded the vehicle, and some struck the car. The driver, whose name has not been released, then opened fire from inside the car as Mr. Foster approached. Another person in the crowd pulled out a handgun and shot at the vehicle as it sped away.
 * > Minutes after the shooting, the driver called 911 and said he had been involved in a shooting and had driven away from the scene, Chief Manley said. The caller told dispatchers he had shot someone who had approached the driver’s window and pointed a rifle at him.
 * > “His account is that Mr. Foster pointed the weapon directly at him and he fired his handgun at Mr. Foster,” the chief said of the driver.
 * > Both the driver and the other person who fired a weapon were detained and interviewed by detectives. Both had state-issued handgun licenses and have been released as the investigation continues, Chief Manley said.
 * > The shooting stunned a capital city where demonstrations and marches are a proud and commonplace tradition. A GoFundMe page to help Mr. Foster’s relatives with his funeral expenses had already raised nearly $100,000 by Sunday evening.
 * > And while Mayor Steve Adler and other officials expressed their condolences on Sunday, at least one police leader criticized Mr. Foster.
 * > On Twitter, Kenneth Casaday, the president of the Austin police officers’ union, retweeted a video clip of Mr. Foster explaining to Mr. Garcia, the independent journalist, why he brought his rifle. In the clip, Mr. Foster is heard using curse words to talk about “all the people that hate us,” but are too afraid to “stop and actually do anything about it.”
 * > In his tweet, Mr. Casaday wrote: “This is the guy that lost his life last night. He was looking for confrontation and he found it.”
 * > Mr. Garcia, who has filmed numerous Austin demonstrations in recent weeks, captured the chaotic moments of the shooting live on video. Protesters are seen marching through an intersection when a car blares its horn. Marchers appear to converge around the car as a man calls out, “Everybody back up.” At that instant, five shots ring out, followed shortly by several more loud bangs that echo through the downtown streets.
 * > Mr. Foster, who had served in the military, was armed, but he was not seeking out trouble at the march, relatives and witnesses told reporters. At the time of the shooting, Mr. Foster was pushing his fiancée through the intersection in her wheelchair.
 * > Mr. Foster and his fiancée, Whitney Mitchell, had been taking part in protests against police brutality in Austin daily since the killing of George Floyd in Minneapolis. Mr. Foster is white, and Ms. Mitchell, who is a quadruple amputee, is African-American. She was not injured in the shooting.
 * > “He was doing it because he feels really strongly about justice and he’s very heavily against police brutality, and he wanted to support his fiancée,” Mr. Foster’s mother, Sheila Foster, said in an interview with “Good Morning America,” adding that she was not surprised he was armed while at the march.
 * > “He does have a license to carry, and he would’ve felt the need to protect himself,” Ms. Foster said.
 * > In Texas, it is lawful to carry rifles, shotguns and other so-called long guns on the street without a permit, as long as the weapons are not brandished in a threatening manner; state-issued licenses are required only to carry handguns.
 * > The presence of Mr. Foster’s weapon could play a key role in the case if the driver claims that he shot Mr. Foster out of fear for his life, a defense allowed under the so-called “stand your ground” law in the state.
 * > The shooting reignited a long-running debate in Texas about the “open carry” movement, in which many men and women carry their rifles and other weapons in public places.
 * > Gun-control supporters say the movement that encourages such displays seeks to intimidate the police and the public, while gun-rights activists defend it as a celebration of their Second Amendment rights.
 * > In a 2016 attack on police officers at a downtown Dallas demonstration, several marchers carried AR-15s and other military-style rifles, and local officials said their presence created confusion for police officers. A single gunman, Micah Johnson, a former Army reservist, killed five officers.
 * > “There are multiple layers to this tragedy, but adding guns to any emotional and potentially volatile situation can, and too often does, lead to deadly violence,” Ed Scruggs, the board president of Texas Gun Sense, a gun legislation reform group, said in a statement about the Austin shooting.
 * > C.J. Grisham, founder and president of the gun-rights organization Open Carry Texas, defended the practice of bringing rifles to rallies and marches, particularly after numerous attacks around the country in which motorists have driven their cars into demonstrations and injured or killed protesters.
 * > “Protesters are under attack from a wide variety of people,” Mr. Grisham said. “It’s unfortunate these days that if you’re going to exercise your First Amendment rights, you probably need to be exercising your Second Amendment rights as well.”
 * > The shooting occurred shortly before 10 p.m. James Sasinowski, 24, a witness, said it seemed the driver was trying to turn a corner and did not want to wait for marchers to pass.
 * > “The driver intentionally and aggressively accelerated into a crowd of people,” Mr. Sasinowski said. “We were not aggravating him at all. He incited the violence.”
 * > Michael Capochiano, another witness, had a slightly different account of what happened. He said he was marching with other demonstrators when he saw a motorist honk his horn and turn toward the crowd, forcing people to scatter.
 * > “You could hear the wheels squealing from hitting the accelerator so fast,” said Mr. Capochiano, 53, a restaurant accountant. “I’m a little surprised that nobody got hit.”
 * > The car came to a stop after turning from Fourth Street onto Congress Avenue and appeared to strike a traffic pylon. As people shouted angrily at the driver, Mr. Foster walked toward the car, with the muzzle of his rifle pointed downward, he said.
 * > “He was not aiming the gun or doing anything aggressive with the gun,” Mr. Capochiano said.  “I’m not sure if there was much of an exchange of words. It wasn’t like there was any sort of verbal altercations. He wasn’t charging at the car.”
 * > David Montgomery reported from Austin and Manny Fernandez from Houston. Bryan Pietsch contributed reporting from Andover, Minn.
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
