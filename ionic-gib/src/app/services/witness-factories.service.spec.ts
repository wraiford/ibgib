import { TestBed } from '@angular/core/testing';

import { WitnessFactoriesService } from './witness-factories.service';

describe('WitnessFactoriesService', () => {
  let service: WitnessFactoriesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WitnessFactoriesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
