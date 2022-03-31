import { IbGib_V1 } from "ts-gib/dist/V1";
import { WitnessData_V1, WitnessRel8ns_V1 } from "./witness";

export interface RobbotsData_V1 extends WitnessData_V1 {

    /**
     * Robbie was only the first Robbot.
     */
    name: string;
}

export interface RobbotsRel8ns_V1 extends WitnessRel8ns_V1 {

}

export interface RobbotsIbGib_V1
    extends IbGib_V1<RobbotsData_V1, RobbotsRel8ns_V1> {

}