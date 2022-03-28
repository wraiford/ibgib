import { TestBed } from '@angular/core/testing';

import { InnerSpacesCacheService } from './inner-spaces-cache.service';

describe('InnerSpacesCacheService', () => {
  let service: InnerSpacesCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InnerSpacesCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
