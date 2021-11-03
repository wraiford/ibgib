import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RootViewComponent } from './root-view.component';

describe('RootViewComponent', () => {
  let component: RootViewComponent;
  let fixture: ComponentFixture<RootViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RootViewComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RootViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
