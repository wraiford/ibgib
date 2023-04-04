import { TestBed } from '@angular/core/testing';
import { getTestBedConfig, getTestBedConfig_Component } from 'src/karma.global';

import { WitnessFactoriesService } from './witness-factories.service';

describe('WitnessFactoriesService', () => {
  let service: WitnessFactoriesService;

  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig()
    ).compileComponents();
    // TestBed.configureTestingModule({});
    service = TestBed.inject(WitnessFactoriesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
