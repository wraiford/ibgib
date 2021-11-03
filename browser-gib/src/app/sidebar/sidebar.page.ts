console.log(`sidebar.page.ts here`);
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Plugins, FilesystemDirectory } from '@capacitor/core';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.page.html',
  styleUrls: ['./sidebar.page.scss'],
})
export class SidebarPage implements OnInit {
  public sidebar: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private platform: Platform,
  ) { }

  ngOnInit() {
    this.sidebar = this.activatedRoute.snapshot.paramMap.get('id');
    console.log(`sidebar.page.ts ngOnInit here`);

    this.platform.ready().then(async () => {
      await this.testStorage();
    });
  }

  async testStorage(): Promise<void> {
    const key = 'some key here';
    const value = 'value here hmmm';
    await Plugins.Storage.set({key, value});
    let result = await Plugins.Storage.get({key});
    console.log(`local storage test value: ${result.value}`);


    const path = 'ibgibs/test_path';
    const directory = FilesystemDirectory.Documents;
    // await Plugins.Filesystem.appendFile({
    //   data: (new Date()).toUTCString(),
    //   path,
    //   directory,
    // });
    // await Plugins.Filesystem.writeFile({
    //   data: value,
    //   path,
    //   directory,
    // });


    const resRead = await Plugins.Filesystem.readFile({
      path,
      directory,
    });

    const resWrite = await Plugins.Filesystem.writeFile({
      data: value + (new Date()).toUTCString(),
      path, directory
    });

    console.log(`Filesystem result: ${resRead.data}`);
    // alert(`Filesystem result: ${resRead.data}`);

    const resReadDir = await Plugins.Filesystem.readdir({path: 'ibgibs', directory});
    console.log(`resReadDir: ${resReadDir.files.toString()}`)

  }

}
