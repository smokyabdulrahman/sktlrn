import asyncio
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: bytes, except_: WebSocket | None = None) -> None:
        """Send a bytes message to all clients concurrently using asyncio.gather."""
        if self.active_connections:  # Avoid calling gather() with an empty list
            await asyncio.gather(
                *[
                    connection.send_bytes(message)
                    for connection in self.active_connections
                    if connection != except_
                ]
            )
