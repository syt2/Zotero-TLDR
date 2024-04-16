import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { tldrs } from "./dataStorage";

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

  // tldr行
  static async registerTLDRItemBoxRow() {
    const itemTLDR = (item: Zotero.Item) => {
      const noteKey = tldrs.get()[item.key];
      if (noteKey) {
        const obj = Zotero.Items.getByLibraryAndKey(item.libraryID, noteKey);
        if (
          obj &&
          obj instanceof Zotero.Item &&
          item.getNotes().includes(obj.id)
        ) {
          let str = obj.getNote();
          if (str.startsWith("<p>TL;DR</p>\n<p>")) {
            str = str.slice("<p>TL;DR</p>\n<p>".length);
          }
          if (str.endsWith("</p>")) {
            str = str.slice(0, -4);
          }
          return str;
        }
      }
      return "";
    }
    Zotero.ItemPaneManager.registerSection({
      paneID: config.addonRef,
      pluginID: config.addonID,
      header: {
        l10nID: `${config.addonRef}-itemPaneSection-header`,
        icon: `chrome://${config.addonRef}/content/icons/favicon@16.png`,
      },
      sidenav: {
        l10nID: `${config.addonRef}-itemPaneSection-sidenav`,
        icon: `chrome://${config.addonRef}/content/icons/favicon@20.png`,
      },
      onRender: ({ body, item }: any) => {
        let tldr = itemTLDR(item);
        if (tldr.length <= 0 && item.parentItem) { tldr = itemTLDR(item.parentItem); }
        body.textContent = tldr;
      },
    });
  }
}
