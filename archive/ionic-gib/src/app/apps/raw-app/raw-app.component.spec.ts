import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { getGlobalInjections, getTestBedConfig_Component } from 'src/karma.global';

import { RawAppComponent } from './raw-app.component';

describe('RawAppComponent', () => {
  let component: RawAppComponent;
  let fixture: ComponentFixture<RawAppComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({
        componentType: RawAppComponent
      })).compileComponents();

    fixture = TestBed.createComponent(RawAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
