import { TestBed } from '@angular/core/testing';

import { IbgibsService } from './ibgibs.service';

describe('IbgibsService', () => {
  let service: IbgibsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IbgibsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
