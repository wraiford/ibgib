import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AppModalFormComponent } from './app-modal-form.component';

describe(AppModalFormComponent.name, () => {
  let component: AppModalFormComponent;
  let fixture: ComponentFixture<AppModalFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AppModalFormComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(AppModalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
