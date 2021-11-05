console.log(`[SidebarPagefile] file loaded.`);

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Plugins, FilesystemDirectory } from '@capacitor/core';
import { Platform } from '@ionic/angular';

import * as ib from 'ts-gib';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.page.html',
  styleUrls: ['./sidebar.page.scss'],
})
export class SidebarPage implements OnInit {
  public sidebar: string;
  private lc = `[${SidebarPage.name}]`;

  constructor(
    private activatedRoute: ActivatedRoute,
    private platform: Platform,
  ) { }

  ngOnInit() {
    let lc = this.lc + '[ngOnInit]';
    this.sidebar = this.activatedRoute.snapshot.paramMap.get('id');
    console.log(`${lc} sidebar.page.ts ngOnInit here`);

    this.platform.ready().then(async () => {
      await this.testStorage();
      await this.testTsgib();
    });
  }

  async testStorage(): Promise<void> {
    let lc = this.lc + `[${this.testStorage.name}]`;
    const key = 'some key here';
    const value = 'value here hmmm';
    await Plugins.Storage.set({key, value});
    let result = await Plugins.Storage.get({key});
    console.log(`${lc} local storage test value: ${result.value}`);


    const path = 'ibgibs/test_path';
    const directory = FilesystemDirectory.Documents;
    // await Plugins.Filesystem.appendFile({
    //   data: (new Date()).toUTCString(),
    //   path,
    //   directory,
    // });
    await Plugins.Filesystem.writeFile({
      data: value,
      path,
      directory,
    });

    console.log(`${lc} calling readFile`);
    try {
      const resRead = await Plugins.Filesystem.readFile({
        path,
        directory,
      });

      
      console.log(`${lc} Filesystem result: ${resRead.data}`);
      // alert(`Filesystem result: ${resRead.data}`);

      console.log(`${lc} calling appendFile`);
      const resWrite = await Plugins.Filesystem.appendFile({
        data: value + (new Date()).toUTCString(),
        path, directory
      });

      const resReadDir = await Plugins.Filesystem.readdir({path: 'ibgibs', directory});
      console.log(`${lc} resReadDir: ${resReadDir.files.toString()}`)
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
    }


  }

  async testIbgib(ibgib: ib.V1.IbGib_V1<ib.V1.IbGibData_V1>): Promise<void> {
    let lc = this.lc + `[${this.testIbgib.name}]`;
    const path = 'ibgibs/test_path';
    const directory = FilesystemDirectory.Documents;
    const key = ibgib.ib;
    const value = JSON.stringify(ibgib);
    console.log(`${lc} storage.setting...`)
    await Plugins.Storage.set({key, value});

    console.log(`${lc} storage.getting...`)
    let result = await Plugins.Storage.get({key});
    console.log(`${lc} get value: ${result.value}`);

    await Plugins.Filesystem.writeFile({
      data: value,
      path,
      directory,
    });

    console.log(`${lc} calling readFile`);
    try {
      const resRead = await Plugins.Filesystem.readFile({
        path,
        directory,
      });

      
      console.log(`${lc} Filesystem result: ${resRead.data}`);
      // alert(`Filesystem result: ${resRead.data}`);

      // await Plugins.Filesystem.appendFile({
      //   data: (new Date()).toUTCString(),
      //   path,
      //   directory,
      // });

      console.log(`${lc} calling appendFile`);
      const resWrite = await Plugins.Filesystem.appendFile({
        data: value + (new Date()).toUTCString(),
        path, directory
      });

      const resReadDir = await Plugins.Filesystem.readdir({path: 'ibgibs', directory});
      console.log(`${lc} resReadDir: ${resReadDir.files.toString()}`)
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
    }
  }

  async testTsgib(): Promise<void> {
    let lc = this.lc + `[${this.testTsgib.name}]`;
    let primitiveIbgib = ib.V1.Factory_V1.primitive({ib: 'primitiveYo'});

    await this.testIbgib(primitiveIbgib);

    let resChildIbgib = await ib.V1.fork({
      src: primitiveIbgib,
      destIb: 'child ib',
      tjp: {
        timestamp: true,
        uuid: true,
      }
    });

    await this.testIbgib(resChildIbgib.newIbGib);

  }
}
