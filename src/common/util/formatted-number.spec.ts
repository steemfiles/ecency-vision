import formattedNumber from "./formatted-number";

it("(1) formattedNumber", () => {
  const res = formattedNumber(1250);
  expect(res).toMatchSnapshot();
  
   
});

it("(2) formattedNumber - with fraction digits", () => {
  const opts = {
    value: 1250,
    fractionDigits: 2,
  };

  const res = formattedNumber(1250, opts);
  expect(res).toMatchSnapshot();
});

it("(3) formattedNumber - with prefix", () => {
  const opts = {
    prefix: "$",
  };

  const res = formattedNumber(100, opts);
  expect(res).toMatchSnapshot();
});

it("(4) formattedNumber - with suffix", () => {
  const opts = {
    suffix: "TL",
  };

  const res = formattedNumber(100, opts);
  expect(res).toMatchSnapshot();
});

it("(5) formattedNumber - with fraction digits and maximum fraction digits", 
  () => {
  const res1 = formattedNumber(1250, {maximumFractionDigits:3, fractionDigits:1});
  expect(res1).toMatchSnapshot();
  
  const res2 = formattedNumber(1250, {maximumFractionDigits:6, fractionDigits:6});
  expect(res2).toMatchSnapshot();

  const res3 = formattedNumber(1e-7, {maximumFractionDigits:8, fractionDigits:6});
  expect(res3).toMatchSnapshot();
  
  const res4 = formattedNumber("0.0000001", {maximumFractionDigits:8, fractionDigits:6});
  expect(res4).toMatchSnapshot();
  
})