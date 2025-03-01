/**
 * Sets a 24-bit unsigned integer in a DataView.
 * @param {DataView} view - The DataView to modify.
 * @param {number} byteOffset - The byte offset where the value should be written.
 * @param {number} value - The 24-bit unsigned integer (0 to 16777215).
 * @param {boolean} littleEndian - Whether to use little-endian byte order.
 */
export function setUint24(view, byteOffset, value, littleEndian = true) {
  if (value < 0 || value > 0xffffff) {
    throw new RangeError("Value out of range (must be 0-16777215).");
  }

  if (littleEndian) {
    view.setUint8(byteOffset, value & 0xff); // Least significant byte
    view.setUint8(byteOffset + 1, (value >> 8) & 0xff);
    view.setUint8(byteOffset + 2, (value >> 16) & 0xff); // Most significant byte
  } else {
    view.setUint8(byteOffset + 2, value & 0xff);
    view.setUint8(byteOffset + 1, (value >> 8) & 0xff);
    view.setUint8(byteOffset, (value >> 16) & 0xff);
  }
}

/**
 * Gets a 24-bit unsigned integer from a DataView.
 * @param {DataView} view - The DataView to read from.
 * @param {number} byteOffset - The byte offset to read from.
 * @param {boolean} littleEndian - Whether to use little-endian byte order.
 * @returns {number} - The retrieved 24-bit unsigned integer.
 */
export function getUint24(view, byteOffset, littleEndian = true) {
  let value;
  if (littleEndian) {
    value =
      view.getUint8(byteOffset) |
      (view.getUint8(byteOffset + 1) << 8) |
      (view.getUint8(byteOffset + 2) << 16);
  } else {
    value =
      (view.getUint8(byteOffset) << 16) |
      (view.getUint8(byteOffset + 1) << 8) |
      view.getUint8(byteOffset + 2);
  }
  return value;
}

/**
 * Reads an integer from a byte array using DataView.
 * @param {Uint8Array} bytes - The byte array containing the data.
 * @param {number} byteOffset - The byte offset to start reading from.
 * @param {number} byteLength - The number of bytes to read (1, 2, 4, etc.).
 * @param {boolean} signed - Whether to read as a signed integer.
 * @param {boolean} littleEndian - Whether to use little-endian byte order.
 * @returns {number} - The parsed integer.
 */
export function getIntFromBytes(
  bytes,
  byteOffset,
  byteLength,
  signed = false,
  littleEndian = true,
) {
  const buffer = bytes.buffer;
  const view = new DataView(buffer);

  switch (byteLength) {
    case 1:
      return signed ? view.getInt8(byteOffset) : view.getUint8(byteOffset);
    case 2:
      return signed
        ? view.getInt16(byteOffset, littleEndian)
        : view.getUint16(byteOffset, littleEndian);
    case 3:
      return getUint24(view, byteOffset, littleEndian);
    case 4:
      return signed
        ? view.getInt32(byteOffset, littleEndian)
        : view.getUint32(byteOffset, littleEndian);
    default:
      throw new Error("Unsupported byte length");
  }
}
