import assert from "node:assert/strict";
import test from "node:test";
import { formatVideoDuration, formatViewCount } from "../src/lib/format.ts";

test("card duration uses a compact clock and carries minute-based API durations", () => {
  assert.equal(formatVideoDuration("00:00"), "0:00");
  assert.equal(formatVideoDuration("07:01"), "7:01");
  assert.equal(formatVideoDuration("90:15"), "1:30:15");
  assert.equal(formatVideoDuration("1:07:01"), "1:07:01");
  assert.equal(formatVideoDuration("123:59:59"), "123:59:59");
});

test("an unavailable or malformed duration retains its label", () => {
  for (const value of ["", "--:--", "unknown", "00:99", "-1:00", "9999999999999999999:00"]) {
    assert.equal(formatVideoDuration(value), value);
  }
});

test("card view counts use Chinese large-number units without rounding up", () => {
  assert.equal(formatViewCount(0), "0");
  assert.equal(formatViewCount(9999), "9999");
  assert.equal(formatViewCount(10_000), "1万");
  assert.equal(formatViewCount(12_345), "1.2万");
  assert.equal(formatViewCount(99_999), "9.9万");
  assert.equal(formatViewCount(123_456_789), "1.2亿");
  assert.equal(formatViewCount(undefined), "0");
  assert.equal(formatViewCount(-1), "0");
});
