import { Plugins } from '@capacitor/core';
const { Storage } = Plugins;
import { waitForAsync } from "@angular/core/testing";

import * as c from 'src/app/common/constants';

beforeEach(waitForAsync(async () => {
    await Storage.set({ key: c.STORAGE_KEY_APP_USES_STUFF, value: 'accepted' });
}));