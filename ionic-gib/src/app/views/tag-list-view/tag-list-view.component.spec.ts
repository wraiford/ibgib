import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TagListViewComponent } from './tag-list-view.component';

describe('TagListViewComponent', () => {
  let component: TagListViewComponent;
  let fixture: ComponentFixture<TagListViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TagListViewComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TagListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
