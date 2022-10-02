import { ComponentFixture, TestBed } from '@angular/core/testing';

import { getGlobalInjections, getTestBedConfig_Component } from 'src/karma.global';
import { RawViewComponent } from './raw-view.component';

describe('RawViewComponent', () => {
  let component: RawViewComponent;
  let fixture: ComponentFixture<RawViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({
        componentType: RawViewComponent
      })).compileComponents();

    fixture = TestBed.createComponent(RawViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
