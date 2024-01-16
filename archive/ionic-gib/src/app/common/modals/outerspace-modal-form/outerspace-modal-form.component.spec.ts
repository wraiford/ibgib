import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { OuterspaceModalFormComponent } from './outerspace-modal-form.component';

describe(OuterspaceModalFormComponent.name, () => {
  let component: OuterspaceModalFormComponent;
  let fixture: ComponentFixture<OuterspaceModalFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: OuterspaceModalFormComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(OuterspaceModalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
