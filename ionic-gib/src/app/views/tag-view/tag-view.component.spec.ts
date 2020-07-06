import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TagViewComponent } from './tag-view.component';

describe('TagViewComponent', () => {
  let component: TagViewComponent;
  let fixture: ComponentFixture<TagViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TagViewComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TagViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
