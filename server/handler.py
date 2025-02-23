from fastapi import WebSocket
from bytes_utils import byte_padding_length, pack_bits, read_uint24
from checkboxes import Checkboxes
from schema import (
    ClientMessageType,
    ClientMessage,
    ServerMessage,
    ServerMessageHeader,
    ServerMessageType,
)
from websocket import ConnectionManager
from logging import getLogger

logger = getLogger(__name__)


class ClientHandler:
    def __init__(
        self,
        checkboxes: Checkboxes,
        connection_manager: ConnectionManager,
    ) -> None:
        self._checkboxes = checkboxes
        self._connection_manager = connection_manager

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
        logger.info("data received", extra={"data": data})
        client_message = ClientMessage.from_bytes(data)
        match client_message.header.type_:
            case ClientMessageType.TOGGLE:
                await self.__handle_toggle_message(client_message, from_)
            case _:
                logger.error(
                    f"Unhandled client message type: {client_message.header.type_}"
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
        broadcast_msg = ServerMessage(
            header=ServerMessageHeader(
                type_=ServerMessageType.TOGGLED,
                last_byte_length=0,
                remaining_2_bits=msg.header.remaining_2_bits,
            ),
            body=msg.body,
        )
        await self._connection_manager.broadcast(
            broadcast_msg.to_bytes(),
            from_,
        )
