import { config } from "../../package.json";

export class Data<K extends string | number | symbol, V> {
  [x: string]: any;
  private filePath: string;
  private _data: Record<K, V>;

  constructor(filePath: string) {
    this.filePath = filePath;
    this._data = {} as Record<K, V>;
  }

  async getAsync() {
    await this.initDataIfNeed();
    return this.data;
  }

  get() {
    return this.data;
  }

  async modify(action: (data: Record<K, V>) => Record<K, V> | Promise<Record<K, V>>) {
    await this.initDataIfNeed();
    const data = this.data;
    const newData = await action(data);
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
  }

  async delete() {
    try {
      await IOUtils.remove(this.filePath);
      this.data = {} as Record<K, V>;
      return true;
    } catch (error) {
      return false;
    }
  }

  private get data() {
    return this._data;
  }

  private set data(value: Record<K, V>) {
    this._data = value;
  }

  private async initDataIfNeed() {
    if (this.inited) { return; }
    this.inited = true;
    try {
      this.data = await IOUtils.readJSON(this.filePath, { decompress: false });
    } catch (error) {
      this.data = {} as Record<K, V>;
    }
  }
}

export class DataStorage {
  private readonly dataDir = PathUtils.join(
    PathUtils.profileDir,
    "extensions",
    config.addonName,
  );
  private dataMap: { [key: string]: Data<any, any> } = {};

  private static shared = new DataStorage();

  static instance<K extends string | number | symbol, V>(dataType: string): Data<K, V> {
    const path = PathUtils.join(this.shared.dataDir, dataType);
    if (this.shared.dataMap[dataType] === undefined) {
      const data = new Data<K, V>(path);
      this.shared.dataMap[dataType] = data;
      return data;
    } else {
      return this.shared.dataMap[dataType];
    }
  }

  private constructor() {
    IOUtils.makeDirectory(this.dataDir, { createAncestors: true, ignoreExisting: true });
  }
}

export const TLDRUnrelated = "tldr-unrelated"; // semantic scholar 找到了该item，但是该item没有tldr
export const TLDRItemNotFound = "tldr-itemnotfound"; // semantic scholar 找不到该item
export const tldrs = DataStorage.instance<string | number, string>('TLDR.json');