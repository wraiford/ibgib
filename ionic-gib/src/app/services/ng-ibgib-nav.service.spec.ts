import { TestBed } from '@angular/core/testing';

import { NgIbgibNavService } from './ng-ibgib-nav.service';

describe('NgIbgibNavService', () => {
  let service: NgIbgibNavService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgIbgibNavService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
