import asyncio
from fastapi import WebSocket
from bytes_utils import byte_padding_length, pack_bits, read_uint24, write_uint24
from checkboxes import Checkboxes
from schema import (
    ClientMessageType,
    ClientMessage,
    ServerMessage,
    ServerMessageHeader,
    ServerMessageType,
)
from websocket import ConnectionManager
import logfire


class ClientHandler:
    def __init__(
        self,
        checkboxes: Checkboxes,
        connection_manager: ConnectionManager,
        broadcast_diff_window_ms: int,
    ) -> None:
        self._checkboxes = checkboxes
        self._connection_manager = connection_manager
        self._prev_checkboxes_state = checkboxes.get_state().copy()
        self._broadcast_diff_window_ms = broadcast_diff_window_ms

    async def start(self) -> None:
        print("starting scheduler..")
        asyncio.create_task(self.broadcast_diff())

    async def broadcast_diff(self) -> None:
        while True:
            # Compute the diff
            current_state = self._checkboxes.get_state()

            previous_state = self._prev_checkboxes_state
            diff = [
                (i, current_state[i])
                for i in range(len(current_state))
                if current_state[i] != previous_state[i]
            ]
            on = b""
            off = b""
            for [i, v] in diff:
                if v == 1:
                    on += write_uint24(i)
                if v == 0:
                    off += write_uint24(i)

            # Swap state references for next iteration
            self._prev_checkboxes_state = current_state.copy()

            # Broadcast the diff
            if len(on) > 1:
                broadcast_msg_on = ServerMessage(
                    header=ServerMessageHeader(
                        type_=ServerMessageType.DIFF,
                        last_byte_length=0,
                        remaining_2_bits=1,
                    ),
                    body=bytes(on),
                )
                await self._connection_manager.broadcast(broadcast_msg_on.to_bytes())
            if len(off) > 1:
                broadcast_msg_off = ServerMessage(
                    header=ServerMessageHeader(
                        type_=ServerMessageType.DIFF,
                        last_byte_length=0,
                        remaining_2_bits=0,
                    ),
                    body=bytes(off),
                )
                await self._connection_manager.broadcast(broadcast_msg_off.to_bytes())

            await asyncio.sleep(self._broadcast_diff_window_ms / 1_000)

    async def init_client(self, ws: WebSocket) -> None:
        checkboxes_state = self._checkboxes.get_state()
        msg = ServerMessage(
            header=ServerMessageHeader(
                type_=ServerMessageType.INIT,
                last_byte_length=byte_padding_length(len(checkboxes_state)),
                remaining_2_bits=0,
            ),
            body=pack_bits(checkboxes_state),  # type: ignore
        ).to_bytes()
        await ws.send_bytes(msg)

    async def handle(self, data: bytes, from_: WebSocket) -> None:
        logfire.info("data received", data=data)
        client_message = ClientMessage.from_bytes(data)
        match client_message.header.type_:
            case ClientMessageType.TOGGLE:
                await self.__handle_toggle_message(client_message, from_)
            case _:
                logfire.error(
                    "Unhandled client message type: {type_}",
                    type_=client_message.header.type_,
                )
                raise ValueError(
                    f"Unhandled client message type: {client_message.header.type_}"
                )

    async def __handle_toggle_message(
        self,
        msg: ClientMessage,
        from_: WebSocket,
    ) -> None:
        value = 1 if msg.header.remaining_2_bits == 1 else 0
        self._checkboxes.set(read_uint24(msg.body), value)
