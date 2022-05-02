import { TestBed } from '@angular/core/testing';

import { SimpleIbgibCacheService } from './simple-ibgib-cache.service';

describe('SimpleIbgibCacheService', () => {
  let service: SimpleIbgibCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SimpleIbgibCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
