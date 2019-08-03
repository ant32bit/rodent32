
const _base32OutMapper: string[] = '0123456789abcdefghjkmnprstuvwxyz'.split('');
const _base32InMapper: {[b32: string]: number } = _base32OutMapper.reduce((p,c,i) => { p[c] = i; return p; }, {});
const _hexInMapper: {[hex: string]: number } = {'0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'a':10,'b':11,'c':12,'d':13,'e':14,'f':15};

let _encoder: FixedCharacterStringEncoder = null;

export abstract class Base32 {
    public static seperationCharacter = 'l';

    public static addHeader(base32Val: string) {
        return this.fromBase16(base32Val.length.toString(16)) + this.seperationCharacter + base32Val;
    }

    public static fromBase10(bigIntVal: string) {
        let digitsIn = bigIntVal
            .split('')
            .map(x => _hexInMapper[x]);
        const digitsOut = [];

        while(digitsIn.length > 1 || digitsIn[0] !== 0) {
            const quotient: number[] = [];
            let remainder = 0;
            let i = 0;
            for (let i = 0; i < digitsIn.length; i++) {
                
                remainder = remainder * 10 + digitsIn[i];

                const dividend = Math.floor(remainder / 32)
                if (quotient.length > 0 || dividend > 0) {
                    quotient.push(...dividend
                        .toString(10)
                        .split('')
                        .map(x => _hexInMapper[x]));
                }

                remainder = remainder % 32;
            }
            digitsIn = quotient;
            digitsOut.unshift(remainder);
            if (digitsIn.length === 0) {
                break;
            }
        }

        return digitsOut.map(x => _base32OutMapper[x]).join('');
    }

    public static fromBase16(hexVal: string) {
        const digitsIn = hexVal
            .replace(/[^0-9a-f]/gi, '')
            .toLowerCase()
            .split('')
            .map(x => _hexInMapper[x.toLowerCase()]);
        return this.fromDigitArray(digitsIn, 4);
    }

    public static fromBase64(base64str: string) {
        const b_data = atob(base64str);
        const bytes = [];
        for (let i = 0; i < b_data.length; i++) {
            bytes[i] = b_data.charCodeAt(i);
        }
        return this.fromDigitArray(bytes, 8);
    }

    public static fromBooleans(booleans: boolean[]) {
        return this.fromDigitArray(booleans.map(x => x ? 1 : 0), 1);
    }

    public static fromDigitArray(arrayOfDigits: number[], digitSizeInBits: number) {

        const masks = this._makeMasks(digitSizeInBits);

        let v = 0;
        let s = 0;

        const t = []

        for(let i = arrayOfDigits.length - 1; i >= 0; i--) {
            let d = arrayOfDigits[i];
            let c = digitSizeInBits;
            
            while(c > 0) {
                let m = 5 - s;
                if (m > c) { m = c; }

                let u = d & masks[0][m]
                d = (d & masks[1][m]) >> m
                c -= m

                v += u << s
                s += m;

                if (s == 5) {
                    t.unshift(_base32OutMapper[v])
                    v = 0
                    s = 0
                }
            }
        }

        if (v > 0) {
            t.unshift(_base32OutMapper[v])
        }

        return t.join('');
    }

    public static toNumber(base32str: string): number {
        const fiveits = base32str.toLowerCase().split('').map(x => _base32InMapper[x]);
        let r = 0;
        let s = 0;
        while (fiveits.length > 0) {
            const c = fiveits.pop();
            r = r + (c << s)
            s += 5
        }
        return r
    }

    public static toDigitArray(base32str: string, digitSizeInBits: number) {

        const masks = this._makeMasks(digitSizeInBits);

        const fiveits = base32str.toLowerCase().split('').map(x => _base32InMapper[x]);
        const digits: number[] = [];
        let r = 0
        let s = 0

        while (fiveits.length > 0) {
            let c = fiveits.pop();
            let g = 5

            while (g > 0) {
                let m = digitSizeInBits - s
                if (m > g) { m = g; }

                r = r + ((c & masks[0][m]) << s);
                c = (c & masks[1][m]) >> m;
                g -= m;
                s += m;

                if (s == digitSizeInBits) {
                    digits.push(r);
                    r = 0;
                    s = 0;
                }
            }
        }

        if (r > 0) {
            digits.push(r);
        }

        return digits.reverse();
    }

    public static set encoder(value: FixedCharacterStringEncoder) { _encoder = value; }
    public static fromString(strVal: string) {
        if (!_encoder) {
            _encoder = new FixedCharacterStringEncoder([strVal]);
        }

        return _encoder.toBase32(strVal);
    }

    public static get stringEncoderDictionary(): string { return _encoder ? _encoder.dictionary : ''; }

    private static _makeMasks(digitSizeInBits: number): number[][] {
        let maxMask = 0x00;
        for (let i = 0; i < digitSizeInBits; i++) { maxMask = (maxMask << 1) + 1; }

        const masks = [[],[]];
        for (let m = 0x00; m <= maxMask; m = (m << 1) + 1) {
            masks[0].push(m);
            masks[1].push(maxMask - m);
        }

        return masks;
    }
}

export class FixedCharacterStringEncoder {
    private _characters: string[];
    private _mapper: {[char: string]: number; }
    private _sizeInBits: number;

    constructor(allPossibleStrings: string[]) {
        this._mapper = {};
        this._characters = [];
        this._sizeInBits = 1;
        const occurred = {};
        for(const str of allPossibleStrings) {
            const chars = str.toString().split('');
            for (const char of chars) {
                if (char in occurred) { continue; }
                occurred[char] = true;
            }
        }

        this._characters = Object.keys(occurred);
        for(var i = this._characters.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = this._characters[i];
            this._characters[i] = this._characters[j];
            this._characters[j] = tmp;
        }
        
        this._mapper = this._characters.reduce((p, c, i) => { p[c] = i + 1; return p; }, {});
        this._sizeInBits = Math.ceil(Math.log2(this._characters.length + 1));
    }

    public get dictionary(): string { return this._characters.join(''); }

    public toBase32(value: string) {
        const digits = value.split('').map(x => this._mapper[x] || 0)
        return Base32.fromDigitArray(digits, this._sizeInBits);
    }
}
