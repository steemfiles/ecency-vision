import numeral from "numeral";
interface Options {
  fractionDigits?: number;
  prefix?: string;
  suffix?: string;
}
export default (value: number | string, options: Options | undefined = undefined) => {
  let opts: Options = {
    fractionDigits: 3,
    prefix: "",
    suffix: "",
  };
  if (options) {
    opts = { ...opts, ...options };
  }
  const { fractionDigits, prefix, suffix } = opts;
  let out : string = "";
  if (typeof value == 'number') {
      let format = "0,0";
      if (fractionDigits) {
        format += "." + "0".repeat(fractionDigits);
      }
      out += numeral(value).format(format);
      out = out.replace(',','');
  } else  {
        value = value.replace(',','');
        const m = value.match(RegExp(/\d+(\.\d+)?/))
        out = m ? m[0] : 'NaN';
  }
  // add commas after the decimal point for readability
  let decimal_location : number = out.length;
  for (let i = 0; i < out.length; ++i) {
        if (out[i] == '.') {
              decimal_location = i;
        }
  }
  if (decimal_location+3 <= out.length) {
      for (let j = decimal_location+4; j < out.length; j += 4) {
          out = out.slice(0, j) + ',' + out.slice(j);
      }
  }
  for (let j = decimal_location - 3; j >= 0; j -= 3) {
      if (j && out[j-1] != ',') {
          out = out.slice(0, j) + ',' + out.slice(j);
          ++decimal_location;
        }
  }
  while (decimal_location < out.length &&  ",0".indexOf( out.charAt(out.length-1) ) != -1  ) {
        out = out.slice(0, out.length-1)
  }
  if (out.charAt(out.length-1) === '.') {
        out = out.slice(0, out.length-1);
  }
  if (prefix) out = prefix + " " + out;
  if (suffix) out += " " + suffix;
  return out;
};
