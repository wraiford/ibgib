import { ComponentFixture, TestBed } from '@angular/core/testing';

import { getGlobalInjections, getTestBedConfig_Component } from 'src/karma.global';
import { AppModalFormComponent } from './app-modal-form.component';

describe(AppModalFormComponent.name, () => {
  let component: AppModalFormComponent;
  let fixture: ComponentFixture<AppModalFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({
        componentType: AppModalFormComponent
      })).compileComponents();

    fixture = TestBed.createComponent(AppModalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
