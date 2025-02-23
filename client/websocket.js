/**
 * A websocket manager that handles reconnection.
 */
export class WebsocketManager {
  /** @type {string} */
  url;
  /** @type {number} */
  maxRetries;
  /** @type {number} */
  retries;
  /** @type {number} */
  retryDelayMs;
  /** @type {WebSocket} */
  ws;
  /** @type {((this: WebSocket, ev: MessageEvent<ArrayBuffer>) => any)} */
  messageHandler;
  /**
   * Creates a WebscoketManager
   * @param {string} url
   * @param {number} maxRetries
   * @param {number} retryDelayMs
   * @param {((this: WebSocket, ev: MessageEvent<ArrayBuffer>) => any)} messageHandler
   * @returns {WebsocketManager}
   */
  constructor(url, maxRetries, retryDelayMs, messageHandler) {
    console.log("creating ws manager...");
    this.url = url;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.retries = 0;
    this.messageHandler = messageHandler;
    this.connect();
  }

  connect() {
    console.log("connecting...");
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.log("ws opened");
      this.retries = 0;
    };

    this.ws.onclose = () => {
      console.log("ws closed");
      if (this.retries >= this.maxRetries) {
        return console.error(
          "Max retries reached. closing connection. refresh page to start again",
        );
      }

      const waitTime = this.retryDelayMs * this.retries;
      console.log("waiting before reconnecting..", waitTime);
      setTimeout(() => {
        console.log("ws reconnecting...");
        this.retries++;
        this.connect();
      }, waitTime);
    };

    this.ws.onmessage = this.messageHandler;

    this.ws.onerror = (error) => {
      console.error("Websocket faced an error.", error);
    };
  }

  /**
   * Sends data through the websocket
   * @param {Uint8Array} data
   * @returns {boolean} - true if message was sent, false otherwise
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    } else {
      console.warn("WebSocket is not open. Message not sent.");
      return false;
    }
  }

  close() {
    this.maxRetries = 0; // Prevent further retries
    if (this.ws) this.ws.close();
  }
}
