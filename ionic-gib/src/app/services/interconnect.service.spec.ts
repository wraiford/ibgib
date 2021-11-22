import { TestBed } from '@angular/core/testing';

import { InterconnectService } from './interconnect.service';

describe('InterconnectService', () => {
  let service: InterconnectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InterconnectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
