import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EncryptionModalFormComponent } from './encryption-modal-form.component';

describe(EncryptionModalFormComponent.name, () => {
  let component: EncryptionModalFormComponent;
  let fixture: ComponentFixture<EncryptionModalFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EncryptionModalFormComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EncryptionModalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
