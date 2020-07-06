import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ActionBarItemComponent } from './action-bar-item.component';

describe('ActionBarItemComponent', () => {
  let component: ActionBarItemComponent;
  let fixture: ComponentFixture<ActionBarItemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ActionBarItemComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ActionBarItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
