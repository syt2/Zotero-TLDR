import { config } from "../../package.json";

export class Data<K extends string | number | symbol, V> {
  [x: string]: any;
  private dataType: string;
  private filePath?: string;
  private _data: Record<K, V>;

  constructor(dataType: string) {
    this.dataType = dataType;
    this._data = {} as Record<K, V>;
  }

  async getAsync() {
    await this.initDataIfNeed();
    return this.data;
  }

  get() {
    return this.data;
  }

  async modify(
    action: (data: Record<K, V>) => Record<K, V> | Promise<Record<K, V>>,
  ) {
    await this.initDataIfNeed();
    const data = this.data;
    const newData = await action(data);
    if (this.filePath) {
      try {
        await IOUtils.writeJSON(this.filePath, newData, {
          mode: "overwrite",
          compress: false,
        });
        this.data = newData;
        return newData;
      } catch (error) {
        return data;
      }
    } else {
      this.data = newData;
      return newData;
    }
  }

  async delete() {
    if (this.filePath) {
      try {
        await IOUtils.remove(this.filePath);
        this.data = {} as Record<K, V>;
        return true;
      } catch (error) {
        return false;
      }
    } else {
      this.data = {} as Record<K, V>;
      return true;
    }
  }

  private get data() {
    return this._data;
  }

  private set data(value: Record<K, V>) {
    this._data = value;
  }

  private async initDataIfNeed() {
    if (this.inited) {
      return;
    }
    this.inited = true;

    const prefsFile = PathUtils.join(PathUtils.profileDir, "prefs.js");
    const prefs = await Zotero.Profile.readPrefsFromFile(prefsFile);
    let dir = prefs["extensions.zotero.dataDir"];
    if (dir) {
      dir = PathUtils.join(dir, config.addonName);
    } else {
      dir = PathUtils.join(
        PathUtils.profileDir,
        "extensions",
        config.addonName,
      );
    }
    IOUtils.makeDirectory(dir, {
      createAncestors: true,
      ignoreExisting: true,
    });
    this.filePath = PathUtils.join(dir, this.dataType);
    try {
      this.data = await IOUtils.readJSON(this.filePath, { decompress: false });
    } catch (error) {
      this.data = {} as Record<K, V>;
    }
  }
}

export class DataStorage {
  private dataMap: { [key: string]: Data<any, any> } = {};

  private static shared = new DataStorage();

  static instance<K extends string | number | symbol, V>(
    dataType: string,
  ): Data<K, V> {
    if (this.shared.dataMap[dataType] === undefined) {
      const data = new Data<K, V>(dataType);
      this.shared.dataMap[dataType] = data;
      return data;
    } else {
      return this.shared.dataMap[dataType];
    }
  }

  private constructor() {
    // empty
  }
}

export const TLDRUnrelated = "tldr-unrelated"; // semantic scholar 找到了该item，但是该item没有tldr
export const TLDRItemNotFound = "tldr-itemnotfound"; // semantic scholar 找不到该item
export const tldrs = DataStorage.instance<string | number, string>("TLDR.json");
