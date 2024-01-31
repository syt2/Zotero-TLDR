import { config } from "../../package.json";
import { getString } from "../utils/locale";

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
}
