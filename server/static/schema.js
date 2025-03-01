/**
 * Defines possible message types from server
 */
export class ServerMessageType {
  static INIT = "INIT";
  static TOGGLED = "TOGGLED";
  static DIFF = "DIFF";

  /**
   * Returns {ServerMessageType} from a number
   * @param {number} num
   * @returns {ServerMessageType}
   *
   */
  static fromNumber(num) {
    switch (num) {
      case 0:
        return ServerMessageType.INIT;
      case 1:
        return ServerMessageType.TOGGLED;
      case 2:
        return ServerMessageType.DIFF;
    }
    console.error(
      "Number: ${num} doesn't map to any known server message type.",
    );
    throw Error("Number: ${num} doesn't map to any known server message type.");
  }
}
/**
 * Represents a server message header.
 */
class ServerMessageHeader {
  /** @type {ServerMessageType} */
  type;
  /** @type {number} */
  lastByteLength;
  /** @type {number} */
  remainingTwoBits;
  /**
   * Creates a new person.
   * @param {ServerMessageType} type - server message type
   * @param {number} lastByteLength - last byte length in this message
   * @param {number} remainingTwoBits - last 2 bits in the header byte, helpful in some message types
   */
  constructor(type, lastByteLength, remainingTwoBits) {
    this.type = type;
    this.lastByteLength = lastByteLength;
    this.remainingTwoBits = remainingTwoBits;
  }
}
/**
 * Represents a server message
 */
export class ServerMessage {
  /** @type {ServerMessageHeader} */
  header;
  /** @type {Uint8Array} */
  body;
  /**
   * Creates a new person.
   * @param {ServerMessageHeader} header - server message header
   * @param {Uint8Array} body - message body
   */
  constructor(header, body) {
    this.header = header;
    this.body = body;
  }
}

/**
 * Parse the first byte of the message received
 * returning a {ServerMessageHeader} to know what
 * action to perform
 * @param {number} byte
 * @returns {ServerMessageHeader}
 *
 */
export function parseServerMessageHeader(byte) {
  const messageType = ServerMessageType.fromNumber(byte >> 5);
  const lastByteLength = (byte & 0b00011100) >> 2;
  const remainingTwoBits = byte & 0b00000011;

  return new ServerMessageHeader(messageType, lastByteLength, remainingTwoBits);
}

/**
 * Parse the message received from server
 * @param {Uint8Array} bytes - bytes received from server
 * @returns {ServerMessage}
 */
export function parseServerMessage(bytes) {
  const messageHeader = parseServerMessageHeader(bytes[0]);
  console.log("header: ", messageHeader);
  return new ServerMessage(
    messageHeader,
    bytes.slice(1), // Skip first byte, as it was parsed as the header
  );
}
