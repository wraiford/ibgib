import { IbGib_V1 } from "ts-gib/dist/V1";
import { WitnessData_V1, WitnessRel8ns_V1 } from "./witness";

export type RobbotTransparency = 'transparent' | 'translucent' | 'opaque';

export interface RobbotData_V1 extends WitnessData_V1 {

    /**
     * Robbie was only the first Robbot.
     */
    name: string;

    /**
     * For simpler robbots (i.e. early implementations), I'm not sure what this
     * will entail. Ideally the function dependency graph is public but right
     * now we're living with witness functionality "off-chain" ("on-chain"
     * stored in git version control).
     *
     * I think atm this will mean that any weighting will be public. If a robbot
     * has any randomness in its decision making, then this should be
     * translucent at least.
     *
     * Of course, even in the future when there are more sovereign "A"Is,
     * transparency doesn't mean you understand where he/she/it is coming from -
     * only that the raw data is available to see.
     */
    reasoningTransparency: RobbotTransparency;

    /**
     * Transparency of timing of planned ibgibs to be presented to the user in a
     * context.
     *
     * For example, when the robbot is asked to process an ibgib context, it
     * must decide when to add which ibgibs to it's output context.
     */
    schedulingTransparency: RobbotTransparency;

    /**
     * Minimum amount of time between outputs allowed by the robbot.
     */
    minSecondsBetweenPosts: number;

    /**
     * Robbots work with scheduling and executing ibgib processing. But
     * it is often (always?) advantageous to give a certain amount of leeway
     * within the algorithms for making scheduling decisions. This is a
     * maximum time variance percentage per decision.
     *
     * So if there is a rigid schedule of every N days, then we allow that
     * it may indeed schedule the ibgib N +- (N * variance/100). If N is 50,
     * and max variance is 10, then this may schedule the output at
     * 50 plus or minus up to 5; consequently a range from 45-55.
     */
    maxTimeVariancePercentage: number;

    /**
     * If true, then this robbot will be started upon app startup, and perhaps
     * in a background service in the future.
     *
     * if false, the robbot will schedule and execute a single "round" only when
     * prompted by a user.
     */
    active: boolean;

    /**
     * Some ibgibs work at the date (day) level of granularity, while others
     * work down to the time.
     */
    scheduleGranularity: 'date' | 'time';

    /**
     * If provided, this will be prepended to any comments made by the robbot.
     */
    commentPrefix?: string;

    /**
     * If provided, this will be appended to any comments made by the robbot.
     */
    commentSuffix?: string;

    /**
     * There are multiple possibilities for where to output:
     *
     * 1. Inside the input context
     * 2. In a different ibgib
     * 3. In the robbot's ibgib
     * 4. Tagged but not "inside" an ibgib.
     *
     * For each of these options, there is the ability to output ibgibs spread
     * out directly inside the output target, or to group them within the output
     * target.
     *
     * Also, it is possible to tag all outputs.
     *
     * ## thoughts
     *
     * Since the driving use case is to create drills, it would seem that inside
     * a single grouping ibgib within the output context makes the most sense.
     */
    outputMode: RobbotOutputMode;
}


/**
 * @see {@link RobbotData_V1.outputMode}
 */
export type RobbotOutputMode = '';

export interface RobbotRel8ns_V1 extends WitnessRel8ns_V1 {

}

/**
 * A robbot's primary function when assigned to an ibgib is to analyze a context
 * ibgib as its input, and output ibgibs into the same or another context.
 *
 * This is quite similar to existing ideas of microservices, but with a few key
 * differences:
 *
 * 1. Robbots exist within the limited domain of ibgib transforms, i.e., `fork`,
 *    `mut8` & `rel8` transforms.
 * 2. Robbots themselves live "on-chain" alongside the data with which they
 *    interact.
 */
export interface RobbotIbGib_V1
    extends IbGib_V1<RobbotData_V1, RobbotRel8ns_V1> {

}