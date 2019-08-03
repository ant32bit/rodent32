
export abstract class ByteArray {

    public static fromBase16(hexVal: string): Uint8Array {
        if (hexVal.length % 2 != 0) { hexVal = '0' + hexVal; }
        const hexBytes = hexVal.match(/[0-9a-f]{2}/gi) || [];
        const bytes = hexBytes.map(x => parseInt('0x' + x));
        return new Uint8Array(bytes);
    }

    public static fromBase64(base64Val: string): Uint8Array {
        const charBytes = atob(base64Val)
        const bytes = charBytes.split('').map(v => v.charCodeAt(0));
        return new Uint8Array(bytes);
    }
}