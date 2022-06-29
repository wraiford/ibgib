import { TestBed } from '@angular/core/testing';

import { InMemoryIbgibCacheService } from './in-memory-ibgib-cache.service';

describe('SimpleIbgibCacheService', () => {
  let service: InMemoryIbgibCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InMemoryIbgibCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
