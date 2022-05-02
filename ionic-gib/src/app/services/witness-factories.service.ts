import { Injectable } from '@angular/core';
import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { Witness } from '../common/types/witness';
import { RandomRobbot_V1_Factory } from '../common/witnesses/robbots/random-robbot-v1';
import { WitnessFactoryAny, WitnessFactoryBase } from '../common/witnesses/witness-factory-base';

@Injectable({
  providedIn: 'root'
})
export class WitnessFactoriesService {

  /**
   *
   */
  protected factories: { [factoryName: string]: WitnessFactoryAny };

  constructor(
    public randomRobbotFactory: RandomRobbot_V1_Factory,
  ) {
    this.factories = {
      [randomRobbotFactory.getName()]: randomRobbotFactory,
     };
  }

  getFactory<
    TWitnessData,
    TWitnessRel8ns extends IbGibRel8ns_V1,
    TWitness extends Witness<IbGib_V1, IbGib_V1, TWitnessData, TWitnessRel8ns>,
    TFactory extends WitnessFactoryBase<TWitnessData, TWitnessRel8ns, TWitness>
  >({
    name,
  }: {
    /**
     * name of the factory
     */
    name: string,
  }): TFactory {
    return <TFactory>this.factories[name];
  }
}
