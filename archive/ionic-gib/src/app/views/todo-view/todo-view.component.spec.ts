import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TodoViewComponent } from './todo-view.component';
import { getGlobalInjections, getTestBedConfig_Component } from 'src/karma.global';

describe('TodoViewComponent', () => {
  let component: TodoViewComponent;
  let fixture: ComponentFixture<TodoViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({
        componentType: TodoViewComponent
      })).compileComponents();

    fixture = TestBed.createComponent(TodoViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
