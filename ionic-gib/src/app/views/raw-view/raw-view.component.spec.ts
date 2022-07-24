import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RawViewComponent } from './raw-view.component';

describe('RawViewComponent', () => {
  let component: RawViewComponent;
  let fixture: ComponentFixture<RawViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [RawViewComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RawViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
