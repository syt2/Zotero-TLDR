import { config } from "../../package.json";

export class Data {
    private filePath: string
    private inited = false;
    private _data: any

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    async getAsync() {
        await this.initDataIfNeed();
        return this.data;
    }

    get() {
        return this.data;
    }

    async modify(action: (data: any) => Promise<any>) {
        await this.initDataIfNeed();
        const data = await this.data;
        const newData = await action(data);
        try {
            await IOUtils.writeJSON(this.filePath, newData, {mode: 'overwrite', compress: false});
            this.data = newData;
            return newData;
        } catch (error) {
            return data;
        }
    }

    async delete() {
        try {
            await IOUtils.remove(this.filePath);
            this.data = {};
            return true;
        } catch (error) {
            return false;
        }
    }

    private get data() {
        return this._data;
    }

    private set data(value: any) {
        this._data = value;
    }

    private async initDataIfNeed() {
        if (this.inited) { return; }
        try {
            this.data = await IOUtils.readJSON(this.filePath, {decompress: false});
        } catch (error) {
            this.data = {};
        }
    }
}

export class DataStorage {
    private readonly dataDir = PathUtils.join(PathUtils.profileDir, 'extensions', config.addonName);
    private dataMap: { [key: string]: Data } = {};

    private static shared = new DataStorage();

    static instance(dataType: string) {
        const path = PathUtils.join(this.shared.dataDir, dataType);
        if (this.shared.dataMap[dataType] === undefined) {
            const data = new Data(path);
            this.shared.dataMap[dataType] = data;
            return data;
        } else {
            return this.shared.dataMap[dataType];
        }
    }

    private constructor() { }
}
