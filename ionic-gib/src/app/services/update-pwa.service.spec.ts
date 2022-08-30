import { TestBed } from '@angular/core/testing';

import { UpdatePwaService } from './update-pwa.service';

describe('UpdatePwaService', () => {
  let service: UpdatePwaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdatePwaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
