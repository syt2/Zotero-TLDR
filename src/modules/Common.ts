import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { tldrs, TLDRItemNotFound, TLDRUnrelated } from "./dataStorage";

export class RegisterFactory {
  // 注册zotero的通知
  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) {
          this.unregisterNotifier(notifierID);
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    // Register the callback in Zotero as an item observer
    const notifierID = Zotero.Notifier.registerObserver(callback, ["item"]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      (e: Event) => {
        this.unregisterNotifier(notifierID);
      },
      false,
    );
  }

  private static unregisterNotifier(notifierID: string) {
    Zotero.Notifier.unregisterObserver(notifierID);
  }

  // 注册首选项配置
  static registerPrefs() {
    // const prefOptions = {
    //   pluginID: config.addonID,
    //   src: rootURI + "chrome/content/preferences.xhtml",
    //   label: getString("prefs.title"),
    //   image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    //   extraDTD: [`chrome://${config.addonRef}/locale/overlay.dtd`],
    //   defaultXUL: true,
    // };
    // ztoolkit.PreferencePane.register(prefOptions);
  }
}

export class UIFactory {
  // item右键菜单
  static registerRightClickMenuItem() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/favicon@0.5x.png`;
    // item menuitem with icon
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      id: "zotero-itemmenu-tldr",
      label: getString("menuitem-updatetldrlabel"),
      commandListener: (ev) => {
        const selectedItems = ZoteroPane.getSelectedItems() ?? [];
        addon.hooks.onUpdateItems(selectedItems, selectedItems.length <= 1);
      },
      icon: menuIcon,
    });
  }

  // collection右键菜单
  static registerRightClickCollectionMenuItem() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/favicon@0.5x.png`;
    ztoolkit.Menu.register("collection", {
      tag: "menuitem",
      id: "zotero-collectionmenu-tldr",
      label: getString("menucollection-updatetldrlabel"),
      commandListener: (ev) =>
        addon.hooks.onUpdateItems(
          ZoteroPane.getSelectedCollection()?.getChildItems() ?? [],
          false,
        ),
      icon: menuIcon,
    });
  }

  // tldr行
  static async registerTLDRItemBoxRow() {
    await ztoolkit.ItemBox.register(
      "TLDR",
      getString("itembox-tldrlabel"),
      (field, unformatted, includeBaseMapped, item, original) => {
        const tldrInfo = tldrs.get()[item.id];
        if (tldrInfo === TLDRUnrelated) {
          return getString(TLDRUnrelated);
        } else if (tldrInfo === TLDRItemNotFound) {
          return getString(TLDRItemNotFound);
        } else if (tldrInfo) {
          return tldrInfo;
        } else {
          return "";
        }
      },
      {
        editable: true,
        setFieldHook: (field, value, loadIn, item, original) => {
          (async () => {
            await tldrs.modify((data: any) => {
              data[item.id] = value;
              return data;
            });
            ztoolkit.ItemBox.refresh();
          })();
          return true;
        },
        index: 2,
        multiline: true,
      },
    );
  }
}
