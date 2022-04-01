import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { OuterspaceModalFormComponent } from './outerspace-modal-form.component';

describe(OuterspaceModalFormComponent.name, () => {
  let component: OuterspaceModalFormComponent;
  let fixture: ComponentFixture<OuterspaceModalFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OuterspaceModalFormComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(OuterspaceModalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
