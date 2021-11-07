import { TestBed } from '@angular/core/testing';

import { LatestIbgibService } from './latest-ibgib.service';

describe('LatestIbgibService', () => {
  let service: LatestIbgibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LatestIbgibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
