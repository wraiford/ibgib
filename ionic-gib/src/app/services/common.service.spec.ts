import { TestBed } from '@angular/core/testing';
import { getTestBedConfig } from 'src/karma.global';

import { CommonService } from './common.service';

describe('CommonService', () => {
  let service: CommonService;

  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig()
    );
    service = TestBed.inject(CommonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
