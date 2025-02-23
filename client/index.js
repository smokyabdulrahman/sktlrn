import {
  parseServerMessage,
  ServerMessage,
  ServerMessageType,
} from "./schema.js";
import { setUint24, getIntFromBytes } from "./bits.js";
import { WebsocketManager } from "./websocket.js";
// TODOs:
// [] prevent users from zooming out
// - check if zoom changed, hide checkboxes and show alert screen (site doesn't work for other than 100% zoom)
// [] based on previous point, add a map mode, where we use a canvas to render an 1000*1000 board

/**
 * @namespace
 * @property {number}             latestUpdateTimeStamp - Timestamp of last dom update.
 * @property {Uint8Array}         checkboxes            - Checkboxes bit array represinting their state.
 * @property {HTMLInputElement} checkboxElementsPool  - Checkbox input rendered elements.
 * @property {number}             totalChecked          - Number of checked check boxes.
 */
const state = {
  latestUpdateTimeStamp: Date.now(),
  checkboxes: new Uint8Array(),
  checkboxElementsPool: [],
  totalChecked: 0,
};

const CHECKBOX_CONTAINER_ID = "checkbox-container";
const CHECKBOX_CONTAINER_FAKE_HEIGHT_DIV_ID = "checkbox-container-fake-height";
const CHECKBOX_CONTAINER_RENDERED_LIST = "checkbox-container-rendered-list";
const CHECKBOX_CLASS = "checkbox";
const CHECKBOX_WIDTH_PX = 50;
const CHECKBOX_HEIGHT_PX = 50;
let CELLS_IN_VIEW = 1;
let COLS = 1;
let ROWS = 1_000_000; // num of checkboxes / view width / cell width
let CONTAINER_WIDTH_PX = 0;
const checkboxContainer = document.getElementById(CHECKBOX_CONTAINER_ID);
const checkboxContainerFakeHeight = document.getElementById(
  CHECKBOX_CONTAINER_FAKE_HEIGHT_DIV_ID,
);
const checkboxContainerRenderedList = document.getElementById(
  CHECKBOX_CONTAINER_RENDERED_LIST,
);

const calculateDimensions = () => {
  CONTAINER_WIDTH_PX = checkboxContainerFakeHeight.offsetWidth;
  COLS = Math.floor(CONTAINER_WIDTH_PX / CHECKBOX_WIDTH_PX);
  ROWS = Math.ceil((state.checkboxes.length * 8) / COLS);
  checkboxContainerFakeHeight.style.height = `${ROWS * CHECKBOX_HEIGHT_PX}px`;
  CELLS_IN_VIEW =
    Math.floor(checkboxContainer.offsetHeight / CHECKBOX_HEIGHT_PX) * COLS;
};

if (
  checkboxContainer &&
  checkboxContainerFakeHeight &&
  checkboxContainerRenderedList
) {
  checkboxContainerFakeHeight.addEventListener("click", handleCheckboxClick);
  calculateDimensions();
  window.onresize = (_) => {
    calculateDimensions();
  };
  checkboxContainer.addEventListener("scroll", handleCheckboxContainerScroll);
} else {
  console.warn("Container with class 'checkbox-container' not found.");
}

const ws = new WebsocketManager("ws://localhost:8000/ws", 15, 300, (event) => {
  const receivedBytes = new Uint8Array(event.data);
  const serverMessage = parseServerMessage(receivedBytes);
  handleMessage(serverMessage);
});

/**
 * Update rendering state of the checkbox pool to reflect the stored state
 */
function updateCells() {
  const scrollTop = checkboxContainer.scrollTop;
  const firstVisibleRow = Math.ceil(
    Math.floor(scrollTop / CHECKBOX_HEIGHT_PX),
    0,
  );
  const translateY = firstVisibleRow * CHECKBOX_HEIGHT_PX;
  //checkboxContainerRenderedList.style.transform = `translateY(${translateY}px)`;

  for (let index = 0; index < state.checkboxElementsPool.length; index++) {
    const checkbox = state.checkboxElementsPool[index];
    const row = firstVisibleRow + Math.floor(index / COLS);
    const col = index % COLS;
    const dataIndex = row * COLS + col;

    const byteLocation = Math.floor(dataIndex / 8);
    const byte = state.checkboxes[byteLocation];
    const bitOrder = dataIndex % 8; // if 0 then most significant bit and 7 is the least significant
    const value = (byte >> (7 - bitOrder)) & 1;

    const stateLength = state.checkboxes.length * 8;
    checkbox.hidden = dataIndex >= stateLength || dataIndex < 0;
    checkbox.dataset.index = dataIndex;
    checkbox.id = `checkbox-${dataIndex}`;
    checkbox.checked = value === 1;
    checkbox.style.transform = `translateY(${translateY}px)`;
  }
}

// used to throttle processing scroll events
let ticking = false;

/**
 * Handles the click event for checkboxes inside a grid container.
 * @param {Event} event - The click event object.
 */
function handleCheckboxContainerScroll(event) {
  if (!event.target) return;

  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateCells();
      ticking = false;
    });

    ticking = true;
  }
}

/**
 * Handles the click event for checkboxes inside a grid container.
 * @param {MouseEvent} event - The click event object.
 */
function handleCheckboxClick(event) {
  /** @type {HTMLInputElement} */
  const target = event.target;

  // Ensure the clicked element is a checkbox with class "check-box"
  if (target.classList.contains(CHECKBOX_CLASS)) {
    const type = 1; // first 3 bits
    const lastByteLength = 0; // second 3 bits
    const toggleValue = target.checked ? 1 : 0; // last 2 bits
    setCheckboxValue(target.dataset.index, toggleValue);
    const header = (type << 5) | (lastByteLength << 2) | toggleValue;
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint8(0, header);
    setUint24(view, 1, parseInt(target.dataset.index, 10));
    ws.send(view);
  }
}

/**
 * Set checkbox checked value in state
 * @param {number} index - index of the checkbox to be updated
 * @param {number} value - 1 if checked 0 if unchecked
 */
function setCheckboxValue(index, value) {
  const byteLocation = Math.floor(index / 8);
  const byte = state.checkboxes[byteLocation];
  const bitOrder = index % 8; // if 0 then most significant bit and 7 is the least significant
  const modifiedByte =
    value == 1 ? byte | (1 << (7 - bitOrder)) : byte & ~(1 << (7 - bitOrder));

  state.checkboxes[byteLocation] = modifiedByte;
}

/**
 * Handles server message based on header.
 * @param {ServerMessage} message
 * @returns {void}
 */
function handleMessage(message) {
  switch (message.header.type) {
    case ServerMessageType.INIT:
      handleInitMessage(message);
      break;
    case ServerMessageType.TOGGLED:
      handleToggledMessage(message);
      break;
    default:
      throw Error(`no handler for message of type ${message.header.type}`);
  }
}

/**
 * Handles init message
 * @param {ServerMessage} message
 * @returns {void}
 */
function handleInitMessage(message) {
  state.checkboxes = message.body;
  state.latestUpdateTimeStamp = Date.now();
  calculateDimensions();
  const bitArray = [];
  const lastIndex = message.body.length - 1;
  let loopCondition = 0;

  for (const [index, byte] of message.body.entries()) {
    loopCondition =
      lastIndex == index ? (7 - message.header.lastByteLength + 1) % 8 : 0;
    for (let i = 7; i >= loopCondition; i--) {
      bitArray.push((byte >> i) & 1);
    }
  }
  renderCheckboxes(bitArray);
}

/**
 * Handles toggled message
 * @param {ServerMessage} message
 * @returns {void}
 */
function handleToggledMessage(message) {
  const checkboxIndex = getIntFromBytes(message.body, 0, 3);
  setCheckboxValue(checkboxIndex, message.header.remainingTwoBits);
  window.requestAnimationFrame(() => {
    updateCells();
  });
}

/**
 * Renders all checkboxes with the given state array.
 * rerenders, if called again. - clears existing checkboxes
 * @param {number[]} bits - arrray of 0 and 1, representing the state of each checkbox to render
 */
function renderCheckboxes(bits) {
  state.checkboxElementsPool.length = 0; // clear array
  checkboxContainerFakeHeight.innerHTML = ""; // Clear previous checkboxes

  console.log(
    `${Math.floor(checkboxContainer.offsetHeight / CHECKBOX_HEIGHT_PX)} * ${COLS} = ${CELLS_IN_VIEW}`,
  );
  for (const [index, bit] of bits.entries()) {
    if (index > CELLS_IN_VIEW) {
      break;
    }
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = bit === 1;
    checkbox.style.width = `${CHECKBOX_WIDTH_PX}px`;
    checkbox.style.height = `${CHECKBOX_HEIGHT_PX}px`;
    checkbox.classList.add(CHECKBOX_CLASS);
    checkbox.dataset.index = index;
    checkbox.id = `checkbox-${index}`;

    checkboxContainerFakeHeight.appendChild(checkbox);
    state.checkboxElementsPool.push(checkbox);
  }
}
