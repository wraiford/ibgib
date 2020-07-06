import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { FallbackViewComponent } from './fallback-view.component';

describe('FallbackViewComponent', () => {
  let component: FallbackViewComponent;
  let fixture: ComponentFixture<FallbackViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FallbackViewComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(FallbackViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
