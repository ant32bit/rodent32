import { Base32, FixedCharacterStringEncoder } from "./base32";

export abstract class Hamster {

    public static export(data: IData) {
        Base32.encoder = new FixedCharacterStringEncoder(data.strings);
        return ['hamster', Base32.stringEncoderDictionary, data.pack()].join('.::')
    }
}

export interface IData {
    value: any;
    strings: string[];
    pack(): string;
}

export class IntegerData implements IData {

    private _value: number;
    public get value(): number { return this._value; }
    public get strings(): string[] { return []; }

    constructor(value: number) {
        this._value = value;
    }

    public pack(): string {
        return 'i' + Base32.addHeader(Base32.fromBase16(Math.floor(this._value).toString(16)));
    }
}

export class BigIntegerData implements IData {
    private _value: string;
    public get value(): string { return this._value; }
    public get strings(): string[] { return []; }
    
    constructor(value: string) {
        this._value = value;
    }

    public pack(): string {
        return 'i' + Base32.addHeader(Base32.fromBase10(this._value));
    }
    
}

export class BitArrayData implements IData {
    private _value: number[];
    private _chunkSize: number;
    public get value(): number[] { return this._value; }
    public get strings(): string[] { return []; }
    
    constructor(value: number[], chunkSize: number = 8) {
        this._value = value;
        this._chunkSize = chunkSize;
    }

    public pack(): string {
        const chunkSizeInd = Base32.fromBase16(this._chunkSize.toString(16)) + Base32.seperationCharacter;
        return 'b' + Base32.addHeader(chunkSizeInd + Base32.fromDigitArray(this._value, this._chunkSize));
    }
}

export class StringData implements IData {
    private _value: string;
    public get value(): string { return this._value; }
    public get strings(): string[] { return [this._value]; }
    
    constructor(value: string) {
        this._value = value.toString();
    }

    public pack(): string {
        return 's' + Base32.addHeader(Base32.fromString(this._value));
    }
}

export class ArrayData implements IData {
    private _value: IData[];
    public get value(): IData[] { return this._value; }
    public get strings(): string[] { 
        return this._value
            .map(x => x.strings)
            .reduce((p, c) => { p.push(...c); return p; }, []);
    }
    
    constructor(value: IData[]) {
        this._value = value;
    }

    public pack(): string {
        const data = this._value
            .filter(x => x != null)
            .map(x => x.pack());

        return 'a' + Base32.addHeader(data.join(''));
    }
}

export class EmptyData implements IData {
    public get value(): any { return null; }
    public get strings(): string[] { return [] }
    public pack(): string { return '0' + Base32.addHeader(''); }
}

export class ObjectData implements IData {
    private _value: {[key: string]: IData};
    public get value(): {[key: string]: IData} { return this._value; }
    public get strings(): string[] { 
        const keys = Object.keys(this._value);
        const values = keys
            .map(x => this._value[x].strings)
            .reduce((p, c) => { p.push(...c); return p; }, []);
        return [...keys, ...values];
    }
    
    constructor(value: {[key: string]: IData}) {
        this._value = value;
    }

    public pack(): string {
        const keys = Object.keys(this._value);
        const data = [];
        for(const key of keys) {
            data.push(Base32.addHeader(Base32.fromString(key)));
            data.push((this._value[key] || new EmptyData()).pack());
        }
        return 'o' + Base32.addHeader(data.join(''));
    }
}