import { TestBed } from '@angular/core/testing';

import { PageSelectorGuard } from './page-selector.guard';

describe('PageSelectorGuard', () => {
  let guard: PageSelectorGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(PageSelectorGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
