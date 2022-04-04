import { IbGib_V1 } from "ts-gib/dist/V1";
import { WitnessData_V1, WitnessRel8ns_V1 } from "./witness";

export interface RobbotData_V1 extends WitnessData_V1 {

    /**
     * Robbie was only the first Robbot.
     */
    name: string;
}

export interface RobbotRel8ns_V1 extends WitnessRel8ns_V1 {

}

export interface RobbotIbGib_V1
    extends IbGib_V1<RobbotData_V1, RobbotRel8ns_V1> {

}