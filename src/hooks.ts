import { RegisterFactory, UIFactory } from "./modules/Common";
import { config } from "../package.json";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import { tldrs } from "./modules/dataStorage";
import { TLDRFetcher } from "./modules/tldrFetcher";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();

  await tldrs.getAsync();

  RegisterFactory.registerPrefs();

  RegisterFactory.registerNotifier();

  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  await Zotero.Promise.delay(1000);

  UIFactory.registerRightClickMenuItem();

  UIFactory.registerRightClickCollectionMenuItem();

  await UIFactory.registerTLDRItemBoxRow();

  onLoad();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  Zotero.log(`${event} ${type} ${ids}, ${extraData}`);
  if (event == "add" && type == "item" && ids.length > 0) {
    onNotifyAddItems(ids);
  } else if (event == "delete" && type == "item" && ids.length > 0) {
    noNotifyDeleteItem(ids);
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onLoad() {
  (async () => {
    let needFetchItems: Zotero.Item[] = [];
    for (const lib of Zotero.Libraries.getAll()) {
      needFetchItems = needFetchItems.concat(
        (await Zotero.Items.getAll(lib.id)).filter((item: Zotero.Item) => {
          return item.isRegularItem() && !item.isCollection();
        }),
      );
    }
    onUpdateItems(needFetchItems, false);
  })();
}

function noNotifyDeleteItem(ids: (string | number)[]) {
  tldrs.modify(data => {
    ids.forEach((id) => {
      delete data[id];
    });
    return data;
  });
}

function onNotifyAddItems(ids: (string | number)[]) {
  const addedRegularItems: Zotero.Item[] = [];
  for (const id of ids) {
    const item = Zotero.Items.get(id);
    if (item.isRegularItem()) {
      addedRegularItems.push(item);
    }
  }
  (async function () {
    await Zotero.Promise.delay(3000);
    onUpdateItems(addedRegularItems, false);
  })();
}

function onUpdateItems(items: Zotero.Item[], forceFetch: boolean = false) {
  items = items.filter((item: Zotero.Item) => {
    if (!item.getField("title")) {
      return false;
    }
    if (!forceFetch) {
      return tldrs.get()[item.id] === undefined
    }
    return true;
  });
  if (items.length <= 0) {
    return;
  }
  const newPopWin = (closeOnClick = true) => {
    return new ztoolkit.ProgressWindow(config.addonName, {
      closeOnClick: closeOnClick,
    }).createLine({
      text: `${getString("popWindow-waiting")}: ${items.length}; ${getString("popWindow-succeed")}: 0; ${getString("popWindow-failed")}: 0`,
      type: "default",
      progress: 0,
    });
  };
  const popupWin = newPopWin().show(-1);
  (async function () {
    const count = items.length;
    const failedItems: Zotero.Item[] = [];
    const succeedItems: Zotero.Item[] = [];
    await (async function () {
      for (const [index, item] of items.entries()) {
        (await new TLDRFetcher(item).fetchTLDR())
          ? succeedItems.push(item)
          : failedItems.push(item);
        await Zotero.Promise.delay(50);
        ztoolkit.ItemBox.refresh();
        popupWin.changeLine({
          progress: (index * 100) / count,
          text: `${getString("popWindow-waiting")}: ${count - index - 1}; ${getString("popWindow-succeed")}: ${succeedItems.length}; ${getString("popWindow-failed")}: ${failedItems.length}`,
        });
      }
    })();

    await (async function () {
      popupWin.changeLine({
        type: "success",
        progress: 100,
        text: `${getString("popWindow-succeed")}: ${succeedItems.length}; ${getString("popWindow-failed")}: ${failedItems.length}`,
      });
      popupWin.startCloseTimer(3000);
    })();
  })();
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintian.

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onUpdateItems,
};
