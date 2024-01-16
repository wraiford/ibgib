import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { SecretModalFormComponent } from './secret-modal-form.component';

describe(SecretModalFormComponent.name, () => {
  let component: SecretModalFormComponent;
  let fixture: ComponentFixture<SecretModalFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: SecretModalFormComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(SecretModalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
