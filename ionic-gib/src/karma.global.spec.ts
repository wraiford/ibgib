import { Preferences } from "@capacitor/preferences";
import { waitForAsync } from "@angular/core/testing";

import * as c from 'src/app/common/constants';

beforeEach(waitForAsync(async () => {
    await Preferences.set({ key: c.STORAGE_KEY_APP_USES_STUFF, value: 'accepted' });
}));
